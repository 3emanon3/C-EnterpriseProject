const API_BASE_URL = '../recervingAPI.php';
let isLeaving = false;
let selectedMemberId = null;
let formChanged = false; // Track if the user has made any changes
let navigateDestination = ''; // Store destination URL for navigation

window.addEventListener('beforeunload', function (e) {
    if (!isLeaving && formChanged) {
        e.returnValue = '确定要取消吗？您的更改可能不会被保。';
    }
});

function confirmCancel() {
    if (formChanged) {
        navigateDestination = 'soldRecord.html';
        showConfirmModal();
    } else {
        isLeaving = true;
        window.location.href = 'soldRecord.html';
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
        formChanged = false;
        
        if (navigateDestination === 'back') {
            history.back();
        } else if (navigateDestination) {
            window.location.href = navigateDestination;
        } else {
            window.location.href = 'soldRecord.html';
        }
    }, 300);
}

// Setup modal event listeners
function setupModalListeners() {
    // Set up confirm modal buttons
    const confirmLeaveBtn = document.getElementById('confirmLeave');
    if (confirmLeaveBtn) {
        confirmLeaveBtn.addEventListener('click', confirmRedirect);
    }
    
    const cancelLeaveBtn = document.getElementById('cancelLeave');
    if (cancelLeaveBtn) {
        cancelLeaveBtn.addEventListener('click', hideConfirmModal);
    }
    
    // Close modals when clicking outside
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                if (modal.id === 'confirmModal') {
                    hideConfirmModal();
                }
            }
        });
    });
}

// Add listener for browser's back button
window.addEventListener('popstate', function(e) {
    if (formChanged) {
        // This doesn't actually prevent navigation in all browsers
        // but we can use it to show our confirmation modal
        navigateDestination = 'back';
        showConfirmModal();
    }
});

// Intercept links and buttons that might navigate away
document.addEventListener('click', function(e) {
    // Find closest anchor or button
    const link = e.target.closest('a, button');
    
    if (link && link.getAttribute('href') && formChanged) {
        // Check if it's not a javascript function and not our action buttons
        const href = link.getAttribute('href');
        if (href && href !== '#' && !href.startsWith('javascript:')) {
            e.preventDefault();
            
            // Store the destination for later navigation
            navigateDestination = href;
            showConfirmModal();
        }
    }
});

async function loadRecordData() {
    const urlParams = new URLSearchParams(window.location.search);
    const recordId = urlParams.get('ID');

    if (!recordId) {
        alert('无法获取记录ID');
        window.location.href = 'soldRecord.html';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}?table=soldrecord&search=true&ID=${recordId}`);
        const data = await response.json();

        if (data && data.data && data.data.length > 0) {
            const record = data.data[0];
            
            // Set form values
            document.getElementById('membership').value = record.membership ? '2' : '0'; // Set to existing member if there's a membership ID, otherwise 'none'
            document.getElementById('Name/Company Name').value = record['Name/Company_Name'] || '';
            document.getElementById('quantity_in').value = record.quantity_in || 0;
            document.getElementById('quantity_out').value = record.quantity_out || 0;
            document.getElementById('InvoiceNo').value = record.InvoiceNo || '';
            document.getElementById('Date').value = record.Date || '';
            document.getElementById('price').value = record.price || '';
            document.getElementById('remarks').value = record.Remarks || '';

            // Update member section based on membership type
            updateMemberSection();

            // If it's an existing member, store the member ID and fetch member details
            if (record.membership) {
                selectedMemberId = record.membership;
                // Fetch and display the member information
                await fetchAndDisplayMemberInfo(record.membership);
            }
        } else {
            alert('找不到记录');
            window.location.href = 'soldRecord.html';
        }
    } catch (error) {
        console.error('Error loading record:', error);
        alert('加载记录失败');
    }
}

// Function to show success modal
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
        window.location.href = 'soldRecord.html';
    }, 1500);
}

async function saveChanges() {
    const urlParams = new URLSearchParams(window.location.search);
    const recordId = urlParams.get('ID');

    if (!recordId) {
        alert('无法获取记录ID');
        return;
    }

    // Get form values
    const companyName = document.getElementById('Name/Company Name').value;
    const quantityIn = parseInt(document.getElementById('quantity_in').value) || 0;
    const quantityOut = parseInt(document.getElementById('quantity_out').value) || 0;
    const invoiceNo = document.getElementById('InvoiceNo').value;
    const date = document.getElementById('Date').value;
    const price = parseFloat(document.getElementById('price').value) || 0;
    const remarks = document.getElementById('remarks').value;

    // Validate required fields
    if (!date) {
        alert('请填写必要的字段：日期');
        return;
    }
    
    // Validate quantity constraint - only one of quantity_in or quantity_out can have a value
    if ((quantityIn > 0 && quantityOut > 0) || (quantityIn === 0 && quantityOut === 0)) {
        alert('请只填写一个数量字段：增加数量或减少数量');
        return;
    }

    let memberId = null;
    const membershipType = document.getElementById('membership').value;

    try {
        // Handle existing member selection
        if (membershipType === '2' && selectedMemberId) {
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
            const position = document.getElementById('position').value;
            const others = document.getElementById('others').value;

            // Validate required member fields
            if (!applicantType) {
                alert('请填写必要的塾员信息：种类');
                return;
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
            
            // Create new member
            const memberData = {
                Name: name,
                CName: cname,
                'Designation_of_Applicant': applicantType,
                Address: address,
                phone_number: contact,
                email: email,
                IC: ic,
                oldIC: oldIc,
                gender: gender,
                componyName: componyName,
                Birthday: monthOfBirth,
                expired_date: formattedExpirationDate, // This can now be null for "none" option
                place_of_birth: placeOfBirth,
                position: position,
                others: others,
                remarks: remarks
            };

            try {
                const memberResponse = await fetch(`${API_BASE_URL}?table=members`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(memberData)
                });

                if (!memberResponse.ok) {
                    throw new Error('Failed to create new member');
                }

                const memberResult = await memberResponse.json();
                if (!memberResult.ids || memberResult.ids.length === 0) {
                    throw new Error('Failed to get ID of new member');
                }

                memberId = memberResult.ids[0];
            } catch (error) {
                console.error('Error creating new member:', error);
                alert(`创建新塾员失败: ${error.message}`);
                return;
            }
        }

        // Prepare record data
        const recordData = {
            ID: recordId,
            'Name/Company_Name': companyName,
            quantity_in: quantityIn > 0 ? quantityIn : null,
            quantity_out: quantityOut > 0 ? quantityOut : null,
            InvoiceNo: invoiceNo,
            Date: date,
            price: price,
            Remarks: remarks,
            membership: memberId,
        };

        // Update record
        const response = await fetch(`${API_BASE_URL}?table=soldrecord&ID=${recordId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(recordData)
        });

        const result = await response.json();

        if (result.status === 'success') {
            formChanged = false; // Reset changes flag
            showSuccessModal(); // Show success modal instead of alert
        } else {
            alert('更新记录失败: ' + (result.message || '未知错误'));
        }
    } catch (error) {
        console.error('Error saving changes:', error);
        alert('保存更改失败: ' + error.message);
    }
}

function updateMemberSection() {
    const membershipType = document.getElementById('membership').value;
    const newMemberSection = document.querySelector('.new-member-section');
    const searchMemberSection = document.querySelector('.search-member-section');

    if (membershipType === '1') { // 未在记录之人 - New member
        newMemberSection.style.display = 'block';
        searchMemberSection.style.display = 'none';
        selectedMemberId = null; // Reset selected member ID when switching
        
        // Add "4 - 专门买书的人" to the others field
        const othersField = document.getElementById('others');
        if (othersField && !othersField.value) {
            othersField.value = "4 - 专门买书的人";
        }
        
        loadApplicantTypes(); // Load applicant types for the dropdown
    } else if (membershipType === '2') { // 已在记录之人 - Existing member
        newMemberSection.style.display = 'none';
        searchMemberSection.style.display = 'block';
    } else if (membershipType === '0') { // 无 - Display no sections
        newMemberSection.style.display = 'none';
        searchMemberSection.style.display = 'none';
        selectedMemberId = null;
    }
}

async function loadApplicantTypes() {
    try {
        const response = await fetch(`${API_BASE_URL}?table=applicants_types&limit=100`);
        const data = await response.json();
        
        const applicantTypeFilter = document.getElementById('applicantTypeFilter');
        
        // Clear existing options except the first one
        while (applicantTypeFilter.options.length > 1) {
            applicantTypeFilter.remove(1);
        }
        
        // Add existing types
        if (data && data.data) {
            data.data.forEach(item => {
                const option = document.createElement('option');
                option.value = item.ID;
                option.textContent = `${item["designation_of_applicant"]}`;
                applicantTypeFilter.appendChild(option);
            });
            
            // Add the "Add New Type" option at the end
            const newTypeOption = document.createElement("option");
            newTypeOption.value = "new";
            newTypeOption.textContent = "添加新种类";
            applicantTypeFilter.appendChild(newTypeOption);
        }
    } catch (error) {
        console.error('Error loading applicant types:', error);
    }
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

// Add event listeners for quantity buttons
document.addEventListener('DOMContentLoaded', function() {
    const quantityButtons = document.querySelectorAll('.quantity-btn');
    
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
    
    quantityButtons.forEach(button => {
        button.addEventListener('click', function() {
            const change = parseInt(this.dataset.change);
            const target = this.dataset.target;
            const input = document.getElementById(target);
            let value = parseInt(input.value) || 0;
            value = Math.max(0, value + change);
            input.value = value;
            formChanged = true;
        });
    });

    // Set expirationType to "none" by default
    if (document.getElementById('expirationType')) {
        document.getElementById('expirationType').value = 'none';
    }
    
    // Initialize expiration fields display
    updateExpirationFields();

    // Load record data when page loads
    loadRecordData();
    
    // Handle applicant type change
    const applicantType = document.getElementById("applicantTypeFilter");
    if (applicantType) {
        applicantType.addEventListener('change', handleApplicantTypeChange);
    }
    
    // Setup modal event listeners
    setupModalListeners();
    
    // After setting default values, reset formChanged flag
    formChanged = false;
});

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
            await loadApplicantTypes();
            
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
    
    formChanged = true;
}

function clearSelectedMember() {
    // Clear the selected member
    selectedMemberId = null;
    document.getElementById('searchResults').innerHTML = '';
    document.getElementById('searchMember').value = '';
    // Focus on the search field
    document.getElementById('searchMember').focus();
    formChanged = true;
}

async function fetchAndDisplayMemberInfo(memberId) {
    try {
        // Fetch member details using the member ID
        const response = await fetch(`${API_BASE_URL}?table=members&search=true&ID=${memberId}`);
        const data = await response.json();

        if (data && data.data && data.data.length > 0) {
            const member = data.data[0];
            
            // Display the selected member in the search results container
            const searchResultsDiv = document.getElementById('searchResults');
            const displayName = member.CName ? `${member.Name} (${member.CName})` : member.Name;
            
            searchResultsDiv.innerHTML = `
                <div class="selected-member">
                    <p><strong>已选择塾员:</strong> ${displayName}</p>
                    <p><strong>塾员ID:</strong> ${member.membersID || 'N/A'}</p>
                    <button class="btn btn-sm btn-primary" onclick="clearSelectedMember()">重新选择</button>
                </div>
            `;
            
            // Update the company name field if it's empty
            if (!document.getElementById('Name/Company Name').value && member.componyName) {
                document.getElementById('Name/Company Name').value = member.componyName;
            }
        }
    } catch (error) {
        console.error('Error fetching member information:', error);
    }
}