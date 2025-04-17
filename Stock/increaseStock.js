const API_BASE_URL = 'http://localhost/projects/C-EnterpriseProject/recervingAPI.php';
let isLeaving = false;
let selectedMemberId = null;
let productUnitPrice = 0; // Store the unit price of the product
let formChanged = false; // Track if the user has made any changes

window.addEventListener('beforeunload', function (e) {
    if (!isLeaving && formChanged) {
        e.returnValue = '确定要取消吗？您的更改可能不会被保。';
    }
});

// Function to fetch product details when page loads
async function fetchProductDetails() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const bookId = urlParams.get('id');
        
        if (!bookId) {
            console.error('No product ID found in URL');
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}?table=stock&search=true&ID=${bookId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch product details');
        }
        
        const data = await response.json();
        if (data && data.data && data.data.length > 0) {
            const product = data.data[0];
            productUnitPrice = parseFloat(product.Price) || 0;
            
            // Update UI with product information if needed
            document.getElementById('productName').textContent = product.Name || 'Product';
        }
    } catch (error) {
        console.error('Error fetching product details:', error);
    }
}

function confirmCancel() {
    if (formChanged) {
        showConfirmModal();
    } else {
        isLeaving = true; // Set flag before redirecting
        window.location.href = 'searchStock.html';
    }
}

// Function to show confirm modal with animation
function showConfirmModal() {
    const modal = document.getElementById('confirmModal');
    
    // Show the modal
    modal.style.display = 'flex';
    
    // Trigger animation
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// Function to hide confirm modal
function hideConfirmModal() {
    const modal = document.getElementById('confirmModal');
    modal.classList.remove('show');
    
    // Wait for animation to complete before hiding
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// Function to confirm and redirect
function confirmRedirect() {
    hideConfirmModal();
    
    // Wait for modal to close before redirecting
    setTimeout(() => {
        isLeaving = true;
        window.location.href = 'searchStock.html';
    }, 300);
}

// Add this function to show the success modal
function showSuccessModal() {
    const modal = document.getElementById('successModal');
    
    // Show the modal
    modal.style.display = 'flex';
    
    // Trigger animation
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
    
    // Redirect after 1.5 seconds
    setTimeout(() => {
        isLeaving = true;
        window.location.href = 'searchStock.html';
    }, 1500);
}

// Function to update price based on quantity
function updatePrice() {
    const quantity = parseInt(document.getElementById('quantity_in').value) || 0;
    const totalPrice = quantity * productUnitPrice;
    document.getElementById('price').value = totalPrice.toFixed(2);
    formChanged = true; // Mark form as changed
}

async function saveChanges() {
    // Get common stock record fields
    const companyName = document.getElementById('Name/Company Name').value;
    const quantityIn = parseInt(document.getElementById('quantity_in').value) || 0;
    const invoiceNo = document.getElementById('InvoiceNo').value;
    const date = document.getElementById('Date').value;
    const price = parseFloat(document.getElementById('price').value) || 0;
    const remarks = document.getElementById('remarks').value;
    
    // Validate required fields
    if (quantityIn <= 0 || !date) {
        alert('请填写必要的字段：增加数量和日期');
        return;
    }
    
    // Get the URL parameters to extract the book ID
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('id');
    
    if (!bookId) {
        alert('无法获取产品ID，请返回产品列表重试');
        return;
    }
    
    let memberId = null;
    const membershipType = document.getElementById('membership').value;
    
    try {
        // Handle existing member selection
        if (membershipType === '2' && selectedMemberId) {
            // Use the selected member ID directly
            memberId = selectedMemberId;
        } 
        // Handle new member creation
        else if (membershipType === '1') {
            // Get new member fields
            const name = document.getElementById('Name').value;
            const cname = document.getElementById('CName').value;
            const applicantType = document.getElementById('applicantTypeFilter').value;
            const address = document.getElementById('Address').value;
            const contact = document.getElementById('Contact').value;
            const email = document.getElementById('Email').value;
            const ic = document.getElementById('IC').value;
            const oldIc = document.getElementById('oldIC').value;
            const gender = document.getElementById('gender').value;
            const componyName = document.getElementById('componyName').value;
            const monthOfBirth = document.getElementById('MonthofBirth').value;
            const placeOfBirth = document.getElementById('placeOfBirth').value;
            const others = document.getElementById('others').value;
            const memberRemarks = document.getElementById('remarks').value;
            
            // Validate required member fields
            if (!applicantType) {
                alert('请填写必要的塾员信息：种类');
                return;
            }
            
            // If the applicant type is "new", prompt user to create a new type
            if (applicantType === "new") {
                const newTypeName = prompt("请输入新的塾员种类名称:");
                if (!newTypeName || newTypeName.trim() === "") {
                    alert('请输入有效的种类名称');
                    return;
                }
                
                try {
                    // Create the new applicant type
                    const newType = {
                        "designation_of_applicant": newTypeName.trim()
                    };
                    
                    // Send request to create new applicant type
                    const typeResponse = await fetch(`${API_BASE_URL}?table=applicants_types`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(newType)
                    });
                    
                    if (!typeResponse.ok) {
                        throw new Error('Failed to create new applicant type');
                    }
                    
                    const typeData = await typeResponse.json();
                    if (!typeData.ids || typeData.ids.length === 0) {
                        throw new Error('Failed to get ID of new applicant type');
                    }
                    
                    // Use the new type ID for the member
                    applicantType = typeData.ids[0];
                } catch (error) {
                    console.error('Error creating new applicant type:', error);
                    alert(`创建新种类失败: ${error.message}`);
                    return;
                }
            }
            
            // Calculate expiration date
            let formattedExpirationDate = null; // Default to null for "none" option
            const expirationType = document.getElementById('expirationType').value;
            
            if (expirationType === '1year') {
                // Add 1 year to current date and subtract 1 day
                let expirationDate = new Date();
                expirationDate.setFullYear(expirationDate.getFullYear() + 1);
                expirationDate.setDate(expirationDate.getDate() - 1);
                formattedExpirationDate = `${expirationDate.getFullYear()}-${(expirationDate.getMonth() + 1).toString().padStart(2, '0')}-${expirationDate.getDate().toString().padStart(2, '0')}`;
            } else if (expirationType === '3year') {
                // Add 3 years to current date and subtract 1 day
                let expirationDate = new Date();
                expirationDate.setFullYear(expirationDate.getFullYear() + 3);
                expirationDate.setDate(expirationDate.getDate() - 1);
                formattedExpirationDate = `${expirationDate.getFullYear()}-${(expirationDate.getMonth() + 1).toString().padStart(2, '0')}-${expirationDate.getDate().toString().padStart(2, '0')}`;
            } else if (expirationType === 'custom') {
                // Get custom expiration date values
                const year = parseInt(document.getElementById('expirationYear').value);
                const month = parseInt(document.getElementById('expirationMonth').value) - 1; // JS months are 0-indexed
                const day = parseInt(document.getElementById('expirationDay').value);
                
                if (year && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
                    let expirationDate = new Date(year, month, day);
                    formattedExpirationDate = `${expirationDate.getFullYear()}-${(expirationDate.getMonth() + 1).toString().padStart(2, '0')}-${expirationDate.getDate().toString().padStart(2, '0')}`;
                } else {
                    alert('请输入有效的到期日期');
                    return;
                }
            }
            // For "none" option, formattedExpirationDate remains null
            
            // Create new member object
            const newMember = {
                'Name': name,
                'CName': cname,
                'Designation_of_Applicant': applicantType,
                'Address': address,
                'phone_number': contact,
                'email': email,
                'IC': ic,
                'oldIC': oldIc,
                'gender': gender,
                'componyName': componyName,
                'Birthday': monthOfBirth,
                'expired_date': formattedExpirationDate, // This can now be null for "none" option
                'place_of_birth': placeOfBirth,
                'others': others,
                'remarks': memberRemarks
            };
            
            // Send request to create new member
            const memberResponse = await fetch(`${API_BASE_URL}?table=members`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newMember)
            });
            
            if (!memberResponse.ok) {
                throw new Error('Failed to create new member');
            }
            
            const memberData = await memberResponse.json();
            memberId = memberData.ids[0]; // Get the ID of the newly created member
        } else {
            memberId = null; // No member selected
        }
        
        // Create sold record object
        const newSoldRecord = {
            'Book': bookId,
            'membership': memberId,
            'Name/Company_Name': companyName,
            'quantity_in': quantityIn,
            'quantity_out': null, // This is an increase record, so quantity_out is 0
            'InvoiceNo': invoiceNo,
            'Date': date,
            'price': price,
            'Remarks': remarks
        };
        
        // Send request to create sold record
        const response = await fetch(`${API_BASE_URL}?table=soldrecord`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newSoldRecord)
        });
        
        if (response.ok) {
            showSuccessModal(); // Replace the alert with the modal
        } else {
            throw new Error('Failed to update stock');
        }
    } catch (error) {
        console.error('Error:', error);
        alert(`操作失败: ${error.message}`);
    }
}


function updateMemberSection() {
    const membershipType = document.getElementById('membership').value;
    const newMemberSection = document.querySelector('.new-member-section');
    const searchMemberSection = document.querySelector('.search-member-section');

    if (membershipType === '1') { // 新人 - New member
        newMemberSection.style.display = 'block';
        searchMemberSection.style.display = 'none';
        selectedMemberId = null; // Reset selected member ID when switching
        
        // Add "4 - 专门买书的人" to the others field
        const othersField = document.getElementById('others');
        if (othersField && !othersField.value) {
            othersField.value = "4 - 专门买书的人";
        }
    } else if (membershipType === '2') { // 旧人 - Existing member
        newMemberSection.style.display = 'none';
        searchMemberSection.style.display = 'block';
    } else if (membershipType === '0') { // 无 - Display both sections without auto-selecting a member
        newMemberSection.style.display = 'none';
        searchMemberSection.style.display = 'none';
        selectedMemberId = null;
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
        // Call the API to search for members
        const searchResponse = await fetch(`${API_BASE_URL}?table=members&search=${encodeURIComponent(searchTerm)}`);
        if (!searchResponse.ok) {
            throw new Error(`Search failed: ${searchResponse.status} - ${searchResponse.statusText}`);
        }

        const data = await searchResponse.json();
        const members = data.data; // API returns JSON array of members

        searchResultsDiv.innerHTML = ''; // Clear "Searching..." message

        if (members && data.total > 0) {
            const ul = document.createElement('ul');
            members.forEach(member => {
                const li = document.createElement('li');
                // Display member name and memberID (not database ID)
                li.textContent = `${member.Name || ''} ${member.CName || ''} (塾员ID: ${member.membersID || 'N/A'})`;
                li.addEventListener('click', function() {
                    // Pass the member ID and name to the selectMember function
                    selectMember(member.ID, member.Name, member.CName, member.membersID);
                });
                ul.appendChild(li);
            });
            searchResultsDiv.appendChild(ul);
        } else {
            searchResultsDiv.textContent = '未找到塾员。'; // Display message if no members found
        }

    } catch (error) {
        console.error('Member search error:', error);
        searchResultsDiv.textContent = '搜索塾员时出错。'; // Display error message to user
    }
}

function selectMember(memberId, memberName, memberCName, membersID) {
    // Store the selected member ID in the global variable
    selectedMemberId = memberId;
    
    // Update the search results div to show the selected member
    const searchResultsDiv = document.getElementById('searchResults');
    const displayName = memberCName ? `${memberName} (${memberCName})` : memberName;
    
    searchResultsDiv.innerHTML = `
        <div class="selected-member">
            <p><strong>已选择塾员:</strong> ${displayName}</p>
            <p><strong>塾员ID:</strong> ${membersID || 'N/A'}</p>
            <button class="btn btn-sm btn-primary" onclick="clearSelectedMember()">重新选择</button>
        </div>
    `;
    
    // Optionally update the company name field with the member name
    const companyNameField = document.getElementById('Name/Company Name');
    if (companyNameField && !companyNameField.value) {
        companyNameField.value = displayName;
    }
}

function clearSelectedMember() {
    // Clear the selected member
    selectedMemberId = null;
    document.getElementById('searchResults').innerHTML = '';
    document.getElementById('searchMember').value = '';
    // Focus on the search field
    document.getElementById('searchMember').focus();
}


function updateExpirationFields() {
    const expirationType = document.getElementById('expirationType').value;
    const customFields = document.getElementById('customExpirationFields');
    const expirationDisplay = document.createElement('div');
    expirationDisplay.id = 'expirationDateDisplay';
    
    // Remove any existing display element
    const oldDisplay = document.getElementById('expirationDateDisplay');
    if (oldDisplay) {
        oldDisplay.remove();
    }
    
    if (expirationType === 'custom') {
        customFields.style.display = 'block';
        // Hide the date display for custom option
    } else {
        customFields.style.display = 'none';
        
        // Create and display calculated date for 1year and 3year options
        if (expirationType === '1year' || expirationType === '3year') {
            const yearsToAdd = expirationType === '1year' ? 1 : 3;
            const currentDate = new Date();
            const futureDate = new Date(currentDate);
            
            futureDate.setFullYear(currentDate.getFullYear() + yearsToAdd);
            
            // For both 1year and 3year options, decrease the day by 1
            futureDate.setDate(futureDate.getDate() - 1);
            
            // Format the date as YYYY-MM-DD
            const formattedDate = `${futureDate.getFullYear()}-${(futureDate.getMonth() + 1).toString().padStart(2, '0')}-${futureDate.getDate().toString().padStart(2, '0')}`;
            
            expirationDisplay.innerHTML = `<p>到期日期: ${formattedDate}</p>`;
            customFields.parentNode.insertBefore(expirationDisplay, customFields);
        }
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    const quantityInput = document.getElementById('quantity_in');
    const quantityButtons = document.querySelectorAll('.quantity-btn');
    const applicantType = document.getElementById("applicantTypeFilter");
    
    // Track form changes
    const formInputs = document.querySelectorAll('input, textarea, select');
    formInputs.forEach(input => {
        input.addEventListener('change', function() {
            formChanged = true;
        });
        input.addEventListener('input', function() {
            formChanged = true;
        });
    });

    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('Date').value = today;
    
    // After setting default values, reset formChanged flag
    formChanged = false;
    
    // Set expirationType to "none" by default
    document.getElementById('expirationType').value = 'none';
    
    // Initialize member section display
    updateMemberSection();
    
    // Initialize expiration fields display
    updateExpirationFields();
    
    // Fetch product details when the page loads
    fetchProductDetails();

    quantityButtons.forEach(button => {
        button.addEventListener('click', function() {
            const change = parseInt(this.dataset.change, 10);
            let currentValue = parseInt(quantityInput.value, 10) || 0;
            let newValue = currentValue + change;
            newValue = Math.max(0, newValue);
            quantityInput.value = newValue;
            
            // Update price when quantity changes via buttons
            updatePrice();
        });
    });
    
    quantityInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '');
        
        // Update price when quantity changes via direct input
        updatePrice();
    });
    
    // Add event listener for applicant type dropdown
    applicantType.addEventListener('change', handleApplicantTypeChange);

    async function fetchApplicantType(){
        try {
            const response = await fetch(`${API_BASE_URL}?table=applicants_types&limit=100`);
            const data = await response.json();
            
            if (data && data.data) {
                // Clear existing options except the first one
                while (applicantType.options.length > 1) {
                    applicantType.remove(1);
                }
                
                // Add unique applicant types to the dropdown
                const uniqueApplicant = data.data;
                uniqueApplicant.forEach(item => {
                    const option = document.createElement("option");
                    option.value = item.ID;
                    option.textContent = `${item["designation_of_applicant"]}`;
                    applicantType.appendChild(option);
                });
                
                // Add the "Add New Type" option at the end
                const newTypeOption = document.createElement("option");
                newTypeOption.value = "new";
                newTypeOption.textContent = "添加新种类";
                applicantType.appendChild(newTypeOption);
            }

        } catch(error) {
            console.error("Error fetching applicant type options:", error);
        }
    }
    
    // Function to handle applicant type selection
    function handleApplicantTypeChange() {
        const applicantTypeSelect = document.getElementById("applicantTypeFilter");
        const selectedValue = applicantTypeSelect.value;
        
        // If "Add New Type" is selected
        if (selectedValue === "new") {
            // Show a prompt to enter new type
            const newTypeName = prompt("请输入新的塾员种类名称:");
            
            // If user entered a value and didn't cancel
            if (newTypeName && newTypeName.trim() !== "") {
                // Reset the dropdown to the first option temporarily
                applicantTypeSelect.value = "";
                
                // Create and add the new type
                createNewApplicantType(newTypeName.trim());
            } else {
                // If user cancelled or entered empty string, reset to default
                applicantTypeSelect.value = "";
            }
        }
    }
    
    // Function to create a new applicant type
    async function createNewApplicantType(typeName) {
        try {
            // Create the new applicant type object
            const newType = {
                "designation_of_applicant": typeName
            };
            
            // Send request to create new applicant type
            const response = await fetch(`${API_BASE_URL}?table=applicants_types`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newType)
            });
            
            if (!response.ok) {
                throw new Error('Failed to create new applicant type');
            }
            
            const data = await response.json();
            
            if (data && data.ids && data.ids.length > 0) {
                const newTypeId = data.ids[0];
                
                // Refresh the applicant types dropdown
                await fetchApplicantType();
                
                // Set the dropdown to the newly created type
                const applicantTypeSelect = document.getElementById("applicantTypeFilter");
                applicantTypeSelect.value = newTypeId;
                
                alert(`新种类 "${typeName}" 已成功添加!`);
            } else {
                throw new Error('Failed to get ID of new applicant type');
            }
        } catch (error) {
            console.error('Error creating new applicant type:', error);
            alert(`创建新种类失败: ${error.message}`);
        }
    }

    fetchApplicantType()
    updateMemberSection(); // Call this initially to set the initial state based on default selection (新人)
});