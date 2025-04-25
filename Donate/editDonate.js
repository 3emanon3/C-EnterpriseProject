const API_BASE_URL = '../recervingAPI.php';



function selectMember(memberId,name) {
    if (!memberId || !name) {
        console.error('Invalid member data:', { memberId, name });
        return;
    }
    
    // Update the hidden member ID field
    document.getElementById('selectedMemberId').value = memberId;
    
    // Update the name/company field
    document.getElementById('nameCompany').value = name;
    
    // Close the modal
    if (memberSearchModal) {
        memberSearchModal.style.display = 'none';
    }
    
    console.log('Member selected:', { memberId, name });
}

document.addEventListener('DOMContentLoaded', function() {
    // DOM element references
    const donationForm = document.getElementById('donationForm');
    const editDonationForm = document.getElementById('editDonationForm');
    const errorMessages = document.getElementById('errorMessages');
    const successMessage = document.getElementById('successMessage');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const donationId = new URLSearchParams(window.location.search).get('id');
    const membershipSelect = document.getElementById('membership');
    const printTableBtn = document.getElementById("printTableBtn");
    
    
     // Get URL parameters for return navigation
 const urlParams = new URLSearchParams(window.location.search);
 const pageParam = urlParams.get('page') || '';
 const queryParam = urlParams.get('query') || '';
 const donationTypeParam = urlParams.get('donationType') || '';


 
 if (printTableBtn) {
        printTableBtn.addEventListener('click', () => {
            console.log("Print button clicked. Triggering window.print().");
            // The @media print CSS rules will handle the layout automatically
            window.print();
        });
    }
 // Function to build return URL - centralized for consistency
 function buildReturnUrl() {
    let returnUrl = 'searchDonate.html';
    const params = [];

    if (pageParam) params.push(`page=${pageParam}`);
    if (queryParam) params.push(`query=${encodeURIComponent(queryParam)}`);
    if (donationTypeParam) params.push(`donationType=${donationTypeParam}`);

    if (params.length > 0) {
        returnUrl += '?' + params.join('&');
    }

    console.log('Return URL:', returnUrl);
    return returnUrl;
}
    
 const returnButton = document.querySelector('.header-actions a.btn.btn-secondary');
 if (returnButton) {
     returnButton.href = buildReturnUrl();
     console.log('Return button href set to:', returnButton.href);
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
        // First initialize dropdowns, then load donation details
        initializeDropdowns().then(() => {
            loadDonationDetails();
        }).catch(error => {
            console.error('Failed to initialize dropdowns:', error);
            showError('Failed to load dropdown options');
        });
    } else {
        window.location.href = buildReturnUrl();
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
   

// Debounce search function
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
      }, delay);
    };
  }


if (modalSearchInput) {
    // Create the debounced search function with the correct parameter
    const debouncedSearch = debounce(() => performModalSearch(1), 300); 
    // Add a single event listener
    modalSearchInput.addEventListener('input', debouncedSearch);
    console.log('Modal search input listener attached');
  }else {
    console.error('Modal search input element not found');
}

if (document.getElementById('modalSearchButton')) {
    document.getElementById('modalSearchButton').addEventListener('click', function() {
        performModalSearch(1);
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
        } else if (this.value === '2') { 
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
                console.log('Donation object details:', {
                    membership: donation.membership,
                    memberId: donation.memberId,
                    memberFields: Object.keys(donation).filter(key => key.toLowerCase().includes('member'))
                });
                populateForm(donation);
            } else {
                showError('Donation record not found');
                setTimeout(() => {
                    // Use the preserved return URL logic when redirecting
                    const urlParams = new URLSearchParams(window.location.search);
                    const page = urlParams.get('page') || '';
                    const query = urlParams.get('query') || '';
                    const donationType = urlParams.get('donationType') || '';
                    
                  
                    const params = [];
                    
                    if (page) params.push(`page=${page}`);
                    if (query) params.push(`query=${encodeURIComponent(query)}`);
                    if (donationType) params.push(`donationType=${donationType}`);
                    
                   
                    
                    window.location.href = buildReturnUrl();
                }, 300);
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
    document.getElementById('nameCompany').value = donation['Name/Company_Name'] || donation.donor_name || '';
    
    // Handle select fields
    setSelectIfExists('donationTypes', donation.donationTypes ||  '');
    setSelectIfExists('bank', donation.Bank ||  '');
    
    // Handle membership field correctly - this is the key fix
    const membershipValue = donation.membership ||  null;
    const selectedMemberIdField = document.getElementById('selectedMemberId');
    // Default to value "2" (Non Member) if membership is null
    let membershipType = donation.membershipType || null;
    
    // If there's a member ID, set the hidden field and select Old Member
    if (membershipValue) {
        selectedMemberIdField.value = membershipValue;
        setSelectIfExists('membership', '1'); // Set to "Old Member"
    } else {
        selectedMemberIdField.value = '';
        setSelectIfExists('membership', '2'); // Set to "Non Member"
    }
    
    // Handle date format
    const paymentDate = donation.paymentDate || donation.payment_date || '';
    if (paymentDate) {
        // Ensure date format is YYYY-MM-DD
        document.getElementById('paymentDate').value = formatDateForInput(paymentDate);
    }

    document.getElementById('receiptNo').value = donation.official_receipt_no || '';
    document.getElementById('amount').value = donation.amount || '';
    document.getElementById('remarks').value = donation.Remarks || '';
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

            const membershipValue = document.getElementById('membership').value;
            let memberIdValue = null;
            let membershipType = null;
            
            // Only use member ID if "Old Member" is selected
            if (membershipValue === '1') {
                memberIdValue = document.getElementById('selectedMemberId').value;
                // Double check we have a valid member ID
             
                console.log('Using member ID:', memberIdValue);
            } else if (membershipValue === '2') {
                membershipType = 'non_member';
            } 

            // Create a structured object that matches API expectations
            const donationData = {
                ID: donationId,
                "Name/Company_Name": document.getElementById('nameCompany').value || null,
                donationTypes: document.getElementById('donationTypes').value || null,
                Bank: document.getElementById('bank').value || null,
                membership: memberIdValue,
                membershipType: membershipType,
                paymentDate: document.getElementById('paymentDate').value || null,
                official_receipt_no: document.getElementById('receiptNo').value || null,
                amount: document.getElementById('amount').value || null,
                Remarks: document.getElementById('remarks').value || null
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
                const returnUrl = buildReturnUrl();
                console.log('Redirecting to:', returnUrl);
                
                setTimeout(() => {
                    window.location.href = returnUrl;
                }, 300);
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
async function performModalSearch(page = 1) {
    showLoading();
    try {
        const searchTerm = modalSearchInput.value.trim();
        currentPage = page;
        
        const response = await fetch(`${API_BASE_URL}?table=members&search=${encodeURIComponent(searchTerm)}&page=${page}&limit=${itemsPerPage}`);
        if (!response.ok) {
            throw new Error(`Search failed: ${response.status}`);
        }
        
        const data = await response.json();
        const members = data.data || [];
        
        modalResultsBody.innerHTML = '';
        
        if (members.length > 0) {
            members.forEach(member => {
                const row = document.createElement('tr');
                const memberId = escapeHTML(member.membersID || '');
                const memberName = escapeHTML(member.Name || member.CName || '');
                const companyName = escapeHTML(member.componyName || '');
                const phoneNumber = escapeHTML(member.phone_number || '');
                row.innerHTML = `
                     <td>${memberId}</td>
                    <td>${memberName}</td>
                    <td>${companyName}</td>
                    <td>${phoneNumber}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="selectMember('${memberId}', '${memberName}')">Select Name</button>
                        <button class="btn btn-sm btn-secondary" onclick="selectMember('${memberId}', '${companyName}')" ${!companyName ? 'disabled' : ''}>Select Company</button>
                    </td>
                `;
                modalResultsBody.appendChild(row);
            });
            
            // Update pagination
            const totalPages = Math.ceil(data.total / itemsPerPage);
            updateModalPagination(totalPages);
            modalNoResults.style.display = 'none';
            memberSearchModal.style.display = 'block';
        } else {
            modalNoResults.style.display = 'block';
            modalNoResults.textContent = '未找到匹配的会员';
        }
    } catch (error) {
        console.error('Search error:', error);
        modalNoResults.style.display = 'block';
        modalNoResults.textContent = `搜索出错: ${error.message}`;
    } finally {
        hideLoading();
    }
}
    // Update modal pagination
    function updateModalPagination(totalPages) {
       
        modalPagination.innerHTML = '';
        
        // Only show pagination when there are multiple pages
        if (totalPages <= 1) return;
        
        // Create pagination buttons
        const prevBtn = document.createElement('button');
    prevBtn.textContent = '上一页';
    prevBtn.className = 'btn btn-pagination';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => performModalSearch(currentPage - 1);
    modalPagination.appendChild(prevBtn);
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = `btn btn-pagination ${currentPage === i ? 'active' : ''}`;
        pageBtn.onclick = () => performModalSearch(i);
        modalPagination.appendChild(pageBtn);
    }
    
    // Next page button
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '下一页';
    nextBtn.className = 'btn btn-pagination';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => performModalSearch(currentPage + 1);
    modalPagination.appendChild(nextBtn);
    }

    // Select member



    // Show error message
    function showError(message) {
        errorMessages.innerHTML = message;
        errorMessages.style.display = 'block';
        successMessage.style.display = 'none';
        
        // Hide error message after 5 seconds
        setTimeout(() => {
            errorMessages.style.display = 'none';
        },300);
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

// Initialize dropdowns with options from API
    async function initializeDropdowns() {
        try {
            console.log('Fetching dropdown options...');
            
            // Fetch donation types
            const donationTypesResponse = await fetch(`${API_BASE_URL}?table=donationtypes&limit=999`);
            const donationTypesData = await donationTypesResponse.json();
            
            if (donationTypesData.data && Array.isArray(donationTypesData.data)) {
                const donationTypeOptions = donationTypesData.data.map(item => ({
                    value: item.ID,
                    text: item.donationTypes
                }));
                const donationTypesSelect = document.getElementById('donationTypes');
                populateDropdown(donationTypesSelect, donationTypeOptions, true);
            }

            // Fetch bank options
            const bankResponse = await fetch(`${API_BASE_URL}?table=bank&limit=999`);
            const bankData = await bankResponse.json();
            
            if (bankData.data && Array.isArray(bankData.data)) {
                const bankOptions = bankData.data.map(item => ({
                    value: item.ID,
                    text: item.Bank
                }));
                const bankSelect = document.getElementById('bank');
                populateDropdown(bankSelect, bankOptions, true);
            }

        } catch (error) {
            console.error('加载下拉选项错误:', error);
            showError('加载选项失败: ' + error.message);
        }
    }

    // Function to populate dropdown with options
    function populateDropdown(selectElement, options, useObjectFormat = false) {
        // Save current value
        const currentValue = selectElement.value;
        
        // Clear existing options, keeping only the first default option
        while (selectElement.options.length > 1) {
            selectElement.remove(1);
        }
        
        // Add new options
        options.forEach(option => {
            const optionElement = document.createElement('option');
            
            if (useObjectFormat && typeof option === 'object') {
                optionElement.value = option.value;
                optionElement.textContent = option.text;
            } else {
                optionElement.value = option;
                optionElement.textContent = option;
            }
            
            selectElement.appendChild(optionElement);
        });
        
        // Restore previous value if it exists in new options
        if (currentValue) {
            for (let i = 0; i < selectElement.options.length; i++) {
                if (selectElement.options[i].value === currentValue) {
                    selectElement.value = currentValue;
                    break;
                }
            }
        }
    }
