document.addEventListener('DOMContentLoaded', function() {
    const donationForm = document.getElementById('donationForm');
    const errorMessages = document.getElementById('errorMessages');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const printButton = document.getElementById('printButton');
    const deleteButton = document.getElementById('deleteButton');
    const donationId = new URLSearchParams(window.location.search).get('id');
    const membershipSelect = document.getElementById('membership');

    // Initialize
    if (donationId) {
        document.getElementById('donationId').value = donationId;
        loadDonationDetails();
    }

    // Event Listeners
    donationForm.addEventListener('submit', function(e) {
        e.preventDefault();

        if (validateForm()) {
            submitForm();
        }
    });

    printButton.addEventListener('click', function() {
        window.print();
    });

  

    // Add event listener for membership select to handle new/old member selection
    membershipSelect.addEventListener('change', async function() {
        if (this.value === 'new') {
            const donorName = document.getElementById('nameCompany').value;
            if (!donorName) {
                showError('请先填写姓名/公司名称，再选择新会员');
                this.value = ''; // Reset the selection
                return;
            }
            
            try {
                showLoading();
                const memberId = await addNewMemberAndGetID(donorName);
                if (memberId) {
                    // Create a new option with the member ID and select it
                    const newOption = document.createElement('option');
                    newOption.value = memberId;
                    newOption.textContent = `${donorName} (ID: ${memberId})`;
                    
                    // Add the new option to the select
                    membershipSelect.appendChild(newOption);
                    
                    // Select the new option
                    membershipSelect.value = memberId;
                } else {
                    this.value = ''; // Reset if there was an error
                }
            } catch (error) {
                showError('添加新会员时出错: ' + error.message);
                this.value = ''; // Reset the selection
            } finally {
                hideLoading();
            }
        } else if (this.value === 'old') {
            try {
                const memberId = await searchAndSelectMember();
                if (memberId) {
                    // Create a new option for the selected member
                    const newOption = document.createElement('option');
                    newOption.value = memberId;
                    newOption.textContent = `会员 ID: ${memberId}`;
                    
                    // Add the new option to the select
                    membershipSelect.appendChild(newOption);
                    
                    // Select the new option
                    membershipSelect.value = memberId;
                } else {
                    this.value = ''; // Reset if user canceled or there was an error
                }
            } catch (error) {
                showError('搜索会员时出错: ' + error.message);
                this.value = ''; // Reset the selection
            }
        }
    });

    // Form validation
    function validateForm() {
        const requiredFields = donationForm.querySelectorAll('[required]');
        let isValid = true;
        const errors = [];

        // Reset all error states
        donationForm.querySelectorAll('.error').forEach(field => {
            field.classList.remove('error');
        });

        // Check required fields
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                isValid = false;
                errors.push(`${field.previousElementSibling.textContent} 是必填项`);
                field.classList.add('error');
            }
        });

        // Validate amount
        const amountField = document.getElementById('amount');
        if (amountField.value && parseFloat(amountField.value) <= 0) {
            isValid = false;
            errors.push('捐赠金额必须大于0');
            amountField.classList.add('error');
        }

        // Validate payment date
        const paymentDateField = document.getElementById('paymentDate');
        if (paymentDateField.value) {
            const selectedDate = new Date(paymentDateField.value);
            const currentDate = new Date();

            if (selectedDate > currentDate) {
                isValid = false;
                errors.push('付款日期不能是未来日期');
                paymentDateField.classList.add('error');
            }
        }

        if (!isValid) {
            showError(errors.join('<br>'));
        } else {
            errorMessages.style.display = 'none';
        }

        return isValid;
    }

    // Submit form data - UPDATED to handle membership IDs correctly
    async function submitForm() {
        const formData = new FormData(donationForm);
        const data = {};

        formData.forEach((value, key) => {
            // Format payment date if needed
            if (key === 'paymentDate' && value) {
                const date = new Date(value);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                data[key] = `${year}-${month}-${day}`;
            }
            // Convert amount to number
            else if (key === 'amount') {
                data[key] = parseFloat(value);
            }
            else {
                data[key] = value;
            }
        });

        // Handle membership value from select - FIXED to preserve hyphenated IDs
        const membershipValue = membershipSelect.value;
        if (membershipValue && membershipValue !== 'new' && membershipValue !== 'old') {
            // Use the membership value directly without parsing as integer
            data.membership = membershipValue;
        } else {
            data.membership = null; // No membership selected or invalid option selected
        }

        // Make membership null if it's empty to avoid foreign key errors
        if (data.membership === null || data.membership === undefined || data.membership === '') {
            // If form requires membership, show an error
            // Uncomment this if membership is required
            /*
            if (document.getElementById('membership').hasAttribute('required')) {
                showError('请选择有效的会员');
                return;
            }
            */
            
            // Otherwise, ensure it's explicitly null for the API
            data.membership = null;
        }

        // Add action type
        data.action = donationId ? 'update_donation' : 'add_donation';

        try {
            showLoading();
            
            // Debug log to check what's being sent to server
            console.log('Sending data to server:', JSON.stringify(data));
            
            const response = await fetch('../recervingAPI.php?table=donation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            // Parse response
            const rawResponse = await response.text();
            console.log('Raw API Response:', rawResponse);

            let parsedData;
            try {
                parsedData = JSON.parse(rawResponse);
            } catch (e) {
                showError('API返回格式错误: ' + rawResponse);
                return;
            }

            if (parsedData.status === 'success') {
                alert('捐赠' + (donationId ? '更新' : '添加') + '成功！');
                window.location.href = 'searchDonate.html';
            } else {
                showError(donationId ? '更新捐赠失败: ' : '添加捐赠失败: ' + (parsedData.message || '未知错误'));
                if (parsedData.error_details) {
                    console.error('Error details:', parsedData.error_details);
                }
            }
        } catch (error) {
            if (error.name === 'TypeError') {
                showError('网络连接失败，请检查网络');
            } else {
                showError('系统错误: ' + error.message);
            }
            console.error('Full error:', error);
        } finally {
            hideLoading();
        }
    }

    // Load donation details - UPDATED to handle membership IDs correctly
    async function loadDonationDetails() {
        try {
            showLoading();
            const response = await fetch(`../recervingAPI.php?table=donation&action=get_donation&id=${donationId}`);

            const rawResponse = await response.text();
            console.log('Raw API Response:', rawResponse);

            let data;
            try {
                data = JSON.parse(rawResponse);
            } catch (e) {
                showError('API返回格式错误: ' + rawResponse);
                return;
            }

            if (data.status === 'success' && data.donation) {
                populateForm(data.donation);
            } else {
                showError('加载捐赠详情失败: ' + (data.message || '未知错误'));
            }
        } catch (error) {
            showError('加载捐赠详情时出错: ' + error.message);
            console.error('Error loading donation details:', error);
        } finally {
            hideLoading();
        }
    }

    // Populate form with donation data - UPDATED to handle membership IDs correctly
    function populateForm(donation) {
        document.getElementById('nameCompany').value = donation.donor_name || '';
        document.getElementById('donationTypes').value = donation.donation_type || '';
        document.getElementById('bank').value = donation.bank || '';
        
        // Handle membership field with proper display
        if (donation.membership) {
            // Check if we already have this member ID as an option
            let memberOption = Array.from(membershipSelect.options).find(opt => opt.value == donation.membership);
            
            if (!memberOption) {
                // If not, create a new option for this member ID
                memberOption = document.createElement('option');
                memberOption.value = donation.membership;
                memberOption.textContent = `会员 ID: ${donation.membership}`;
                membershipSelect.appendChild(memberOption);
            }
            
            // Select the member option
            membershipSelect.value = donation.membership;
        } else {
            membershipSelect.value = '';
        }

        // Format payment date if needed
        if (donation.payment_date) {
            const dateOnly = donation.payment_date.split(' ')[0]; // Extract date part if datetime
            document.getElementById('paymentDate').value = dateOnly;
        }

        document.getElementById('receiptNo').value = donation.receipt_no || '';
        document.getElementById('amount').value = donation.amount || '';
        document.getElementById('remarks').value = donation.remarks || '';
    }

    // Helper functions
    function showError(message) {
        errorMessages.innerHTML = message;
        errorMessages.style.display = 'block';
        window.scrollTo(0, errorMessages.offsetTop);
    }

    function showLoading() {
        loadingIndicator.style.display = 'block';
    }

    function hideLoading() {
        loadingIndicator.style.display = 'none';
    }

    // Find the existing select elements
    const bankSelect = document.getElementById('bank');
    const donationTypesSelect = document.getElementById('donationTypes');
    
    // Add "Add New" option to each dropdown
    addCustomOption(bankSelect, '添加新银行...');
    addCustomOption(donationTypesSelect, '添加新乐捐类型...');

    // Add event listeners to handle custom option selection
    bankSelect.addEventListener('change', function() {
        handleCustomOptionSelection(this, '银行', 'bank');
    });

    donationTypesSelect.addEventListener('change', function() {
        handleCustomOptionSelection(this, '乐捐类型', 'donation_type');
    });

    /**
     * Adds a custom option to a select element
     * @param {HTMLSelectElement} selectElement - The select dropdown
     * @param {string} optionText - The text for the "Add new" option
     */
    function addCustomOption(selectElement, optionText) {
        const customOption = document.createElement('option');
        customOption.value = 'custom';
        customOption.textContent = optionText;

        // Add a separator before the custom option
        const separator = document.createElement('option');
        separator.disabled = true;
        separator.textContent = '──────────';

        selectElement.appendChild(separator);
        selectElement.appendChild(customOption);
    }

    /**
     * Handles the selection of the custom option
     * @param {HTMLSelectElement} selectElement - The select dropdown
     * @param {string} itemType - The type of item being added (for display)
     */
    function handleCustomOptionSelection(selectElement, itemType) {
        if (selectElement.value === 'custom') {
            const newOption = prompt(`请输入新的${itemType}:`);
            if (newOption) {
                // Here you would typically make an API call to add to database
                // For now, let's just add it to the dropdown
                const optionElement = document.createElement('option');
                optionElement.value = newOption;
                optionElement.textContent = newOption;
                
                // Insert before the separator
                const separatorIndex = Array.from(selectElement.options).findIndex(opt => opt.disabled);
                if (separatorIndex !== -1) {
                    selectElement.insertBefore(optionElement, selectElement.options[separatorIndex]);
                } else {
                    selectElement.insertBefore(optionElement, selectElement.options[selectElement.options.length - 2]);
                }
                
                selectElement.value = newOption;
            } else {
                // If user cancels the prompt, reset the dropdown to empty
                selectElement.value = '';
            }
        }
    }

    /**
     * Adds a new member and returns the ID
     * @param {string} memberName - The name of the new member
     * @returns {Promise<number|null>} - The new member ID or null if failed
     */
    async function addNewMemberAndGetID(memberName) {
        const data = {
            action: 'add_member',
            Name: memberName,
            CName: memberName,
           
          
         
        };
    
        try {
            const response = await fetch('../recervingAPI.php?table=members', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
    
            const rawResponse = await response.text();
            console.log('Raw API Response (add_member):', rawResponse);
    
            let parsedData;
            try {
                parsedData = JSON.parse(rawResponse);
            } catch (e) {
                showError('API返回格式错误: ' + rawResponse);
                return null;
            }
    
            if (parsedData.status === 'success' || parsedData.success === true) {
                const newMemberId = parsedData.membersID || parsedData.member_id || parsedData.id;
                
                if (newMemberId) {
                    alert(`新会员 "${memberName}" 添加成功，会员ID: ${newMemberId}`);
                    return newMemberId;
                } else {
                    showError('添加成功但未返回会员ID。');
                    return null;
                }
            } else {
                showError(`添加新会员失败: ${parsedData.message || parsedData.error || '未知错误'}`);
                return null;
            }
        } catch (error) {
            showError('添加新会员时网络错误: ' + error.message);
            return null;
        }
    }

    /**
     * Search for an existing member and return the selected ID
     * @returns {Promise<number|null>} - The selected member ID or null if cancelled
     */
    async function searchAndSelectMember() {
        console.log('searchAndSelectMember() function called!');
        const searchName = prompt("请输入会员姓名以搜索 (或留空查看所有会员):");
        console.log('searchName:', searchName);
        
        let currentPage = 1;
        
        // Function to load and display a specific page
        async function loadAndDisplayPage(page) {
            let searchUrl = `../recervingAPI.php?table=members&action=search_member&page=${page}`;
            
            // Add search parameter if user entered a name
            if (searchName && searchName.trim()) {
                searchUrl += `&name=${encodeURIComponent(searchName.trim())}`;
            }
            
            try {
                showLoading(); // Show loading indicator
                const response = await fetch(searchUrl);
                const rawResponse = await response.text();
                console.log(`Raw API Response (search_member page ${page}):`, rawResponse);
                hideLoading(); // Hide loading indicator
                
                let parsedData;
                try {
                    parsedData = JSON.parse(rawResponse);
                } catch (e) {
                    showError('API返回格式错误: ' + rawResponse);
                    return null;
                }
                
                // Check if data exists and has members
                const members = parsedData.data || [];
                
                if (members.length > 0) {
                    const pagination = parsedData.pagination || {
                        page: 1,
                        total_pages: 1,
                        total_records: members.length
                    };
                    
                    // Create a formatted table display for better readability
                    let memberListText = "找到以下会员，请选择一个会员:\n\n";
                    memberListText += "序号 | ID | 姓名/公司名称 | 联系方式 | 备注\n";
                    memberListText += "------------------------------------------------\n";
                    
                    members.forEach((member, index) => {
                        // Get member name (try different possible fields)
                        const displayName = member.Name || member.CName || member.componyName || "未命名会员";
                        
                        // Get contact info (if available)
                        const contactInfo = member.email || member.phone || member.contact || "-";
                        
                        // Get any additional important information
                        const additionalInfo = member.designation_of_applicant || member.membership_type || member.status || "-";
                        
                        memberListText += `${index + 1}. | ${member.membersID} | ${displayName} | ${contactInfo} | ${additionalInfo}\n`;
                    });
                    
                    // Add pagination controls and information
                    memberListText += "\n------------------------------------------------\n";
                    memberListText += `当前第 ${pagination.page}/${pagination.total_pages} 页 (总计 ${pagination.total_records} 条记录)\n`;
                    
                    // Navigation options
                    let promptOptions = "\n请选择操作:\n";
                    promptOptions += `- 输入会员序号(1-${members.length})选择一个会员\n`;
                    
                    if (pagination.page > 1) {
                        promptOptions += "- 输入 'p' 查看上一页\n";
                    }
                    
                    if (pagination.page < pagination.total_pages) {
                        promptOptions += "- 输入 'n' 查看下一页\n";
                    }
                    
                    if (pagination.total_pages > 1) {
                        promptOptions += "- 输入 'g' 后跟页码跳转到指定页 (例如: g3)\n";
                    }
                    
                    promptOptions += "- 输入 'q' 取消选择";
                    
                    // Show the prompt with all options
                    const userChoice = prompt(memberListText + promptOptions);
                    
                    if (userChoice === null || userChoice.toLowerCase() === 'q') {
                        // User cancelled
                        return null;
                    } else if (userChoice.toLowerCase() === 'p' && pagination.page > 1) {
                        // Previous page
                        return await loadAndDisplayPage(pagination.page - 1);
                    } else if (userChoice.toLowerCase() === 'n' && pagination.page < pagination.total_pages) {
                        // Next page
                        return await loadAndDisplayPage(pagination.page + 1);
                    } else if (userChoice.toLowerCase().startsWith('g') && pagination.total_pages > 1) {
                        // Go to specific page
                        const pageNum = parseInt(userChoice.substring(1));
                        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= pagination.total_pages) {
                            return await loadAndDisplayPage(pageNum);
                        } else {
                            alert(`无效的页码。请输入1到${pagination.total_pages}之间的数字。`);
                            return await loadAndDisplayPage(pagination.page);
                        }
                    } else {
                        // Try to parse as a member selection index
                        const index = parseInt(userChoice) - 1;
                        
                        if (!isNaN(index) && index >= 0 && index < members.length) {
                            const selectedMember = members[index];
                            const displayName = selectedMember.Name || selectedMember.CName || selectedMember.componyName || "未命名会员";
                            
                            // Ask for confirmation
                            const confirmSelection = confirm(`您选择了: ${displayName || selectedMember.membersID}\n\n确认选择此会员?`);
                            
                            if (confirmSelection) {
                                // Return the selected member ID WITHOUT parsing as integer
                                alert(`已选择会员 ID: ${selectedMember.membersID}`);
                                return selectedMember.membersID;
                            } else {
                                // User cancelled confirmation, show the same page again
                                return await loadAndDisplayPage(pagination.page);
                            }
                        } else {
                            alert('无效的选择，请重试。');
                            return await loadAndDisplayPage(pagination.page);
                        }
                    }
                } else {
                    if (searchName && searchName.trim()) {
                        alert(`未找到名为 "${searchName}" 的会员。`);
                    } else {
                        alert('未找到任何会员。');
                    }
                    return null;
                }
            } catch (error) {
                hideLoading(); // Make sure to hide loading indicator on error
                showError('搜索会员时网络错误: ' + error.message);
                return null;
            }
        }
        
        // Start by loading the first page
        return await loadAndDisplayPage(currentPage);
    }
});