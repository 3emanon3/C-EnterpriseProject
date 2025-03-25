const API_BASE_URL = 'http://localhost/projects/C-EnterpriseProject/recervingAPI.php';

document.addEventListener('DOMContentLoaded', function() {
    // DOM element references
    const donationForm = document.getElementById('donationForm');
    const editDonationForm = document.getElementById('editDonationForm');
    const errorMessages = document.getElementById('errorMessages');
    const successMessage = document.getElementById('successMessage');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const donationId = new URLSearchParams(window.location.search).get('id');
    const membershipSelect = document.getElementById('membership');
    
    // Get return button and update its href to preserve pagination and search state
    const returnButton = document.querySelector('.header-actions a.btn-secondary');
    if (returnButton) {
        const urlParams = new URLSearchParams(window.location.search);
        const page = urlParams.get('page') || '';
        const query = urlParams.get('query') || '';
        const donationType = urlParams.get('donationType') || '';
        
        // Build the return URL with all relevant parameters
        let returnUrl = 'searchDonate.html';
        const params = [];
        
        if (page) params.push(`page=${page}`);
        if (query) params.push(`query=${encodeURIComponent(query)}`);
        if (donationType) params.push(`donationType=${donationType}`);
        
        if (params.length > 0) {
            returnUrl += '?' + params.join('&');
        }
        
        returnButton.href = returnUrl;
    }
    
    // Modal elements
    const memberSearchModal = document.getElementById('memberSearchModal');
    const modalSearchInput = document.getElementById('modalSearchInput');
    const modalResultsBody = document.getElementById('modalResultsBody');
    const modalLoadingIndicator = document.getElementById('modalLoadingIndicator');
    const modalNoResults = document.getElementById('modalNoResults');
    const modalPagination = document.getElementById('modalPagination');

    // Modal variables
    let currentPage = 1;
    let currentSearchTerm = '';
    const itemsPerPage = 10;
    let totalItems = 0;

    // Initialize - If there's an ID parameter, load donation details
    if (donationId) {
        document.getElementById('donationId').value = donationId;
        loadDonationDetails();
    } else {
        // If no ID parameter, redirect back to search page
        // Use the same return URL logic as for the button
        const urlParams = new URLSearchParams(window.location.search);
        const page = urlParams.get('page') || '';
        const query = urlParams.get('query') || '';
        const donationType = urlParams.get('donationType') || '';
        
        let redirectUrl = 'searchDonate.html';
        const params = [];
        
        if (page) params.push(`page=${page}`);
        if (query) params.push(`query=${encodeURIComponent(query)}`);
        if (donationType) params.push(`donationType=${donationType}`);
        
        if (params.length > 0) {
            redirectUrl += '?' + params.join('&');
        }
        
        window.location.href = redirectUrl;
    }

    // Event listeners
    if (donationForm) {
        donationForm.addEventListener('submit', handleFormSubmit);
    }
    
    // Edit form event listener
    if (editDonationForm) {
        editDonationForm.addEventListener('submit', handleFormSubmit);
    }

    // Handle form submission
    function handleFormSubmit(e) {
        e.preventDefault();
        if (validateForm()) {
            updateDonation();
        }
    }
    
    const closeModalBtn =document.querySelector('.close');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function() {
            memberSearchModal.style.display = 'none';
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === memberSearchModal) {
            memberSearchModal.style.display = 'none';
        }
    });

    // Modal search input handler
    if (modalSearchInput) {
        modalSearchInput.addEventListener('input', function() {
            // Debounce search to avoid too many requests
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                performModalSearch(1);
            }, 300);
        });
    }

    // Membership selection event - updated with new values
    membershipSelect.addEventListener('change', async function() {
        if (this.value === '1') { // Old Member (was '2' before)
            // Use modal search directly
            memberSearchModal.style.display = 'block';
            modalSearchInput.focus();
            modalSearchInput.value = '';
            modalResultsBody.innerHTML = '';
            modalNoResults.style.display = 'none';
            modalPagination.innerHTML = '';

            performModalSearch(1);
        } else if (this.value === '2') { // Non Member (was '3' before)
            // Clear previously selected member ID
            if (document.getElementById('selectedMemberId')) {
                document.getElementById('selectedMemberId').value = '';
            }
        }
    });

    // Load donation details
    async function loadDonationDetails() {
        showLoading();
        try {
            console.log(`Fetching donation data for ID: ${donationId}`);
            const response = await fetch(`${API_BASE_URL}?table=donation&search=true&ID=${donationId}`);
            if (!response.ok) {
                throw new Error(`Loading failed: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Loaded donation data:', data);
            
            if (data.data && data.data.length > 0) {
                const donation = data.data[0];
                populateForm(donation);
            } else {
                showError('Donation record not found');
                setTimeout(() => {
                    // Use the preserved return URL logic when redirecting
                    const urlParams = new URLSearchParams(window.location.search);
                    const page = urlParams.get('page') || '';
                    const query = urlParams.get('query') || '';
                    const donationType = urlParams.get('donationType') || '';
                    
                    let redirectUrl = 'searchDonate.html';
                    const params = [];
                    
                    if (page) params.push(`page=${page}`);
                    if (query) params.push(`query=${encodeURIComponent(query)}`);
                    if (donationType) params.push(`donationType=${donationType}`);
                    
                    if (params.length > 0) {
                        redirectUrl += '?' + params.join('&');
                    }
                    
                    window.location.href = redirectUrl;
                }, 2000);
            }
        } catch (error) {
            console.error('Error loading donation details:', error);
            showError(`Failed to load donation details: ${error.message}`);
        } finally {
            hideLoading();
        }
    }

    // Populate form data
    // Modify the populateForm function to correctly handle membership value:
function populateForm(donation) {
    // Handle possible property name variations
    document.getElementById('nameCompany').value = donation['Name/Company Name'] || donation.donor_name || '';
    
    // Handle select fields
    setSelectIfExists('donationTypes', donation.donationTypes || donation.donation_type || '');
    setSelectIfExists('bank', donation.Bank || donation.bank || '');
    
    // Handle membership field correctly - this is the key fix
    const membershipValue = donation.membership || donation.Membership || null;
    // Default to value "2" (Non Member) if membership is null
    setSelectIfExists('membership', membershipValue === null ? '2' : membershipValue);
    
    // If there's a member ID, set the hidden field and select Old Member
    if (donation.memberId) {
        document.getElementById('selectedMemberId').value = donation.memberId;
        setSelectIfExists('membership', '1'); // Set to Old Member
    } else {
        // Clear the selected member ID if no member is associated
        if (document.getElementById('selectedMemberId')) {
            document.getElementById('selectedMemberId').value = '';
        }
    }
    
    // Handle date format
    const paymentDate = donation.paymentDate || donation.payment_date || '';
    if (paymentDate) {
        // Ensure date format is YYYY-MM-DD
        document.getElementById('paymentDate').value = formatDateForInput(paymentDate);
    }

    document.getElementById('receiptNo').value = donation['official receipt no'] || donation.receipt_no || '';
    document.getElementById('amount').value = donation.amount || '';
    document.getElementById('remarks').value = donation.Remarks || donation.remarks || '';
}

    // Helper function to set select value if element exists
    function setSelectIfExists(id, value) {
        const element = document.getElementById(id);
        if (element && value) {
            setSelectValue(element, value);
        }
    }

    // Set dropdown value
    function setSelectValue(selectElement, value) {
        const stringValue = String(value);
        for (let i = 0; i < selectElement.options.length; i++) {
            if (selectElement.options[i].value === stringValue) {
                selectElement.selectedIndex = i;
                break;
            }
        }
    }

    // Format date for input (YYYY-MM-DD)
    function formatDateForInput(dateString) {
        if (!dateString) return '';
        
        // Try to parse various date formats
        let date;
        
        // Handle numeric timestamp
        if (!isNaN(dateString)) {
            date = new Date(parseInt(dateString));
        } else {
            // Check if format is MM/DD/YYYY
            const parts = dateString.split(/[-\/]/);
            if (parts.length === 3) {
                // If second part is > 12, assume DD/MM/YYYY format
                if (parseInt(parts[1]) > 12) {
                    date = new Date(`${parts[2]}-${parts[0]}-${parts[1]}`);
                } else {
                    date = new Date(dateString);
                }
            } else {
                date = new Date(dateString);
            }
        }
        
        if (isNaN(date.getTime())) {
            console.warn('Invalid date format:', dateString);
            return '';
        }
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    }

    // Validate form
    function validateForm() {
        const nameCompany = document.getElementById('nameCompany').value.trim();
        const donationTypes = document.getElementById('donationTypes').value;
        const bank = document.getElementById('bank').value;
        const membership = document.getElementById('membership').value;
        const paymentDate = document.getElementById('paymentDate').value;
        const amount = document.getElementById('amount').value;
        
        let errors = [];
        
        if (!nameCompany) errors.push('Please enter name/company name');
        if (!donationTypes) errors.push('Please select donation type');
        if (!bank) errors.push('Please select bank');
        if (!membership) errors.push('Please select membership status');
        if (!paymentDate) errors.push('Please select payment date');
        if (!amount || isNaN(amount) || parseFloat(amount) <= 0) errors.push('Please enter a valid amount');
        
        if (errors.length > 0) {
            showError(errors.join('<br>'));
            return false;
        }
        
        return true;
    }

    // Update donation
    async function updateDonation() {
        showLoading();
        
        try {
            console.log('Donation update started');
            
            if (!donationId) {
                throw new Error('Donation ID missing, cannot update record');
            }
            
            const paymentDateField = document.getElementById('paymentDate');
            if (paymentDateField.value && !isValidDateFormat(paymentDateField.value)) {
                showError('Payment date format must be YYYY-MM-DD');
                hideLoading();
                return;
            }
            
            // Create a structured object that matches API expectations
            const donationData = {
               // ID: document.getElementById('ID').value,
                donor_name: document.getElementById('nameCompany').value || null,
                donationTypes: document.getElementById('donationTypes').value || null,
                Bank: document.getElementById('bank').value || null,
                membership: document.getElementById('membership').value === '1' ? 
                document.getElementById('selectedMemberId').value || null : null,
                paymentDate: document.getElementById('paymentDate').value || null,
                receipt_no: document.getElementById('receiptNo').value || null,
                amount: document.getElementById('amount').value || null,
                Remarks: document.getElementById('remarks').value || null,
                memberId: document.getElementById('selectedMemberId')?.value || null
            };
            
           
            
            console.log('Sending data:', donationData);
            
            // Use PUT method for updating
            const response = await fetch(`${API_BASE_URL}?table=donation&ID=${donationId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(donationData)
            });


            const responseText = await response.text();
            console.log('Raw response:', responseText);
            
            let responseData;
            try {
                responseData = JSON.parse(responseText);
            } catch (e) {
                console.error('Failed to parse response as JSON:', e);
                throw new Error(`API returned invalid JSON: ${responseText.substring(0, 100)}...`);
            }
            
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} - ${response.statusText}`);
            }
            
           
            console.log('API response:', responseData);
            
            if (responseData.status === 'success' || response.ok) {
                showSuccess('Donation updated successfully!');
                setTimeout(() => {
                    // Use the preserved return URL logic when redirecting after success
                    const urlParams = new URLSearchParams(window.location.search);
                    const page = urlParams.get('page') || '';
                    const query = urlParams.get('query') || '';
                    const donationType = urlParams.get('donationType') || '';
                    
                    let redirectUrl = 'searchDonate.html';
                    const params = [];
                    
                    if (page) params.push(`page=${page}`);
                    if (query) params.push(`query=${encodeURIComponent(query)}`);
                    if (donationType) params.push(`donationType=${donationType}`);
                    
                    if (params.length > 0) {
                        redirectUrl += '?' + params.join('&');
                    }
                    
                    window.location.href = redirectUrl;
                }, 3000);
            } else {
                throw new Error(responseData.message || 'Donation update failed');
            }
        } catch (error) {
            console.error('Donation update error:', error);
            showError(`Update failed: ${error.message}`);
        } finally {
            hideLoading();
        }
    }
    
    // Helper function for date validation
    function isValidDateFormat(dateString) {
        // Check if the date is in YYYY-MM-DD format
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(dateString)) return false;
        
        // Check if it's a valid date
        const date = new Date(dateString);
        return !isNaN(date.getTime());
    }

    // Modal search functionality
// Modal search functionality
function performModalSearch(page = 1) {
    const searchTerm = modalSearchInput.value.trim();
    currentSearchTerm = searchTerm;
    currentPage = page;
    
    // Show loading indicator
    modalLoadingIndicator.style.display = 'block';
    modalNoResults.style.display = 'none';
    modalResultsBody.innerHTML = '';
    
    // Get data from API - adding console logs to debug
    console.log(`Searching members with term: "${searchTerm}"`);
    
    // Modified API URL - ensure search parameter is properly formatted
    const apiUrl = `${API_BASE_URL}?table=members&search=true&query=${encodeURIComponent(searchTerm)}&page=${page}&limit=${itemsPerPage}`;
    console.log('API URL:', apiUrl);
    
    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Search failed: ${response.status} - ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            modalLoadingIndicator.style.display = 'none';
            console.log('Search response:', data);
            
            // Check if data has the expected structure
            const members = data.data || [];
            
            if (members && members.length > 0) {
                displayModalResults(members);
                totalItems = data.total || members.length;
                updateModalPagination();
            } else {
                modalNoResults.style.display = 'block';
            }
        })
        .catch(error => {
            modalLoadingIndicator.style.display = 'none';
            console.error('Member search error:', error);
            alert('Error searching members: ' + error.message);
        });
}

    // Display modal search results
  // Modify your displayModalResults function to match the actual response structure
function displayModalResults(members) {
    modalResultsBody.innerHTML = '';
    
    members.forEach(member => {
        const row = document.createElement('tr');
        // Update these lines to match the actual property names from the response
        row.innerHTML = `
            <td>${escapeHTML(member.membersID || '')}</td>
            <td>${escapeHTML(member.Name || '')}</td>
            <td>${escapeHTML(member.componyName || '')}</td>
            <td>${escapeHTML(member.phone_number || '')}</td>
        `;
        
        // Add click event to select member
        row.style.cursor = 'pointer';
        row.addEventListener('click', function() {
            selectMember(member);
        });
        
        modalResultsBody.appendChild(row);
    });
    
    // Add this line to debug - display the modal
    memberSearchModal.style.display = 'block';
}

    // Update modal pagination
    function updateModalPagination() {
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        modalPagination.innerHTML = '';
        
        // Only show pagination when there are multiple pages
        if (totalPages <= 1) return;
        
        // Create pagination buttons
        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.className = i === currentPage ? 'active' : '';
            pageButton.addEventListener('click', () => performModalSearch(i));
            modalPagination.appendChild(pageButton);
        }
    }

    // Select member
    function selectMember(member) {
        // Set member ID to hidden field
        document.getElementById('selectedMemberId').value = member.ID;
        
        // Set name/company name
        const nameField = document.getElementById('nameCompany');
        nameField.value = member.Name || member['Company Name'] || '';
        
        // Close modal
        memberSearchModal.style.display = 'none';
    }

    // Show error message
    function showError(message) {
        errorMessages.innerHTML = message;
        errorMessages.style.display = 'block';
        successMessage.style.display = 'none';
        
        // Hide error message after 5 seconds
        setTimeout(() => {
            errorMessages.style.display = 'none';
        }, 5000);
    }

    // Show success message
    function showSuccess(message) {
        successMessage.innerHTML = message;
        successMessage.style.display = 'block';
        errorMessages.style.display = 'none';
    }

    // Show loading indicator
    function showLoading() {
        loadingIndicator.style.display = 'block';
    }

    // Hide loading indicator
    function hideLoading() {
        loadingIndicator.style.display = 'none';
    }

    // HTML escape function to prevent XSS attacks
    function escapeHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
});