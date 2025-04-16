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
        isLeaving = true;
        window.location.href = 'soldRecord.html';
    }
}

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
            document.getElementById('membership').value = '2'; //set to two because 
            document.getElementById('Name/Company Name').value = record['Name/Company Name'] || '';
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
            'Name/Company Name': companyName,
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
            alert('记录更新成功！');
            isLeaving = true;
            window.location.href = 'soldRecord.html';
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
    const memberSearch = document.querySelector('.membersearch');
    const newMemberSection = document.querySelector('.new-member-section');
    const existingMemberSection = document.querySelector('.existing-member-section');

    memberSearch.style.display = 'block';

    if (membershipType === '1') {
        newMemberSection.style.display = 'block';
        existingMemberSection.style.display = 'none';
        loadApplicantTypes();
    } else {
        newMemberSection.style.display = 'none';
        existingMemberSection.style.display = 'block';
    }
}

async function loadApplicantTypes() {
    try {
        const response = await fetch(`${API_BASE_URL}?table=applicants%20types`);
        const data = await response.json();
        
        const applicantTypeFilter = document.getElementById('applicantTypeFilter');
        
        // Clear existing options except the first one
        while (applicantTypeFilter.options.length > 1) {
            applicantTypeFilter.remove(1);
        }
        
        // Add option to create new type
        const newOption = document.createElement('option');
        newOption.value = 'new';
        newOption.textContent = '+ 创建新种类';
        applicantTypeFilter.appendChild(newOption);
        
        // Add existing types
        if (data && data.data) {
            data.data.forEach(type => {
                const option = document.createElement('option');
                option.value = type.ID;
                option.textContent = type['designation of applicant'];
                applicantTypeFilter.appendChild(option);
            });
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
    quantityButtons.forEach(button => {
        button.addEventListener('click', function() {
            const change = parseInt(this.dataset.change);
            const target = this.dataset.target;
            const input = document.getElementById(target);
            let value = parseInt(input.value) || 0;
            value = Math.max(0, value + change);
            input.value = value;
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

    // Set up member search functionality
    const memberSearch = document.getElementById('memberSearch');
    if (memberSearch) {
        memberSearch.addEventListener('input', debounce(searchMembers, 300));
    }
});

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function searchMembers() {
    const searchTerm = document.getElementById('memberSearch').value;
    const resultsContainer = document.querySelector('.member-results');

    if (!searchTerm) {
        resultsContainer.innerHTML = '';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}?table=members&search=${encodeURIComponent(searchTerm)}`);
        const data = await response.json();

        resultsContainer.innerHTML = '';

        if (data && data.data && data.data.length > 0) {
            data.data.forEach(member => {
                const memberDiv = document.createElement('div');
                memberDiv.className = 'member-result';
                memberDiv.innerHTML = `
                    <div class="member-info">
                        <span class="member-name">${member.Name || ''} (${member.CName || ''})</span>
                        <span class="member-details">塾员ID: ${member.membersID || 'N/A'}</span>
                    </div>
                    <button class="btn btn-primary select-member" data-id="${member.ID}">选择</button>
                `;

                memberDiv.querySelector('.select-member').addEventListener('click', () => {
                    selectedMemberId = member.ID;
                    document.getElementById('Name/Company Name').value = member.componyName || '';
                    resultsContainer.innerHTML = `
                        <div class="selected-member">
                            已选择: ${member.Name || ''} (${member.CName || ''})
                            <button class="btn btn-small btn-danger" onclick="clearSelectedMember()">清除</button>
                        </div>
                    `;
                });

                resultsContainer.appendChild(memberDiv);
            });
        } else {
            resultsContainer.innerHTML = '<div class="no-results">没有找到塾员</div>';
        }
    } catch (error) {
        console.error('Error searching members:', error);
        resultsContainer.innerHTML = '<div class="error">搜索塾员时出错</div>';
    }
}

function clearSelectedMember() {
    selectedMemberId = null;
    document.getElementById('Name/Company Name').value = '';
    document.querySelector('.member-results').innerHTML = '';
    document.getElementById('memberSearch').value = '';
}


async function fetchAndDisplayMemberInfo(memberId) {
    try {
        // Fetch member details using the member ID
        const response = await fetch(`${API_BASE_URL}?table=members&search=true&ID=${memberId}`);
        const data = await response.json();

        if (data && data.data && data.data.length > 0) {
            const member = data.data[0];
            
            // Display the selected member in the member-results container
            const resultsContainer = document.querySelector('.member-results');
            resultsContainer.innerHTML = `
                <div class="selected-member">
                    已选择塾员: ${member.Name || ''} (${member.CName || ''})
                    <button class="btn btn-small btn-danger" onclick="clearSelectedMember()">清除</button>
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