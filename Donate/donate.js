document.addEventListener('DOMContentLoaded', function() {
    const donationForm = document.getElementById('donationForm');
    const errorMessages = document.getElementById('errorMessages');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const printButton = document.getElementById('printButton');
    const deleteButton = document.getElementById('deleteButton');
    const donationId = new URLSearchParams(window.location.search).get('id');
    const membershipSelect = document.getElementById('membership');
    const newMemberId = new URLSearchParams(window.location.search).get('memberId');

    // Initialize
    if (donationId) {
        document.getElementById('donationId').value = donationId;
        loadDonationDetails();
    }

    // Handle redirected from member page with new member ID
    if (newMemberId) {
        handleReturnedNewMember(newMemberId);
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
        if (this.value === '1') {
            const donorName = document.getElementById('nameCompany').value;
            if (!donorName) {
                showError('请先填写姓名/公司名称，再选择新会员');
                this.value = ''; // Reset the selection
                return;
            }
            
            try {
                showLoading();
                // Save current form data to session storage before redirecting
                saveFormDataToSession();
                
                // Instead of adding member directly, redirect to member management page
                const tempMemberId = await addNewMemberAndGetID(donorName);
                if (tempMemberId) {
                    // Redirect to member management page with the new ID
                    window.location.href = `donateMember.html?id=${tempMemberId}&returnToForm=true`;
                } else {
                    this.value = ''; // Reset if there was an error
                }
            } catch (error) {
                showError('添加新会员时出错: ' + error.message);
                this.value = ''; // Reset the selection
            } finally {
                hideLoading();
            }
        } else if (this.value === '2') {
            openMemberSearchDialog();
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

    // Save form data to session storage
    function saveFormDataToSession() {
        const formData = {};
        // Get values from all form fields
        const formElements = donationForm.elements;
        for (let i = 0; i < formElements.length; i++) {
            const element = formElements[i];
            if (element.name && element.name !== 'membership') { // Skip the membership field
                formData[element.name] = element.value;
            }
        }
        // Store in session storage
        sessionStorage.setItem('donationFormData', JSON.stringify(formData));
    }

    // Restore form data from session storage
    function restoreFormDataFromSession() {
        const storedData = sessionStorage.getItem('donationFormData');
        if (storedData) {
            const formData = JSON.parse(storedData);
            // Set values for all stored form fields
            for (const field in formData) {
                const element = document.getElementById(field) || document.querySelector(`[name="${field}"]`);
                if (element) {
                    element.value = formData[field];
                }
            }
            // Clear the stored data
            sessionStorage.removeItem('donationFormData');
        }
    }

    // Handle returned from member page with new member ID
    function handleReturnedNewMember(memberId) {
        // Restore the previously saved form data
        restoreFormDataFromSession();
        
        // Fetch member details to get name
        fetch(`../recervingAPI.php?table=members&action=get_member&id=${memberId}`)
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success' && data.member) {
                    const memberName = data.member.Name || data.member.CName || `会员 ID: ${memberId}`;
                    
                    // Create and add a new option
                    const newOption = document.createElement('option');
                    newOption.value = memberId;
                    newOption.textContent = `${memberName} (ID: ${memberId})`;
                    membershipSelect.appendChild(newOption);
                    
                    // Select the new option
                    membershipSelect.value = memberId;
                } else {
                    showError('无法获取新会员详情');
                }
            })
            .catch(error => {
                showError('获取会员详情出错: ' + error.message);
            });
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
                    // Store the ID in localStorage or sessionStorage
                    sessionStorage.setItem('pendingMemberId', newMemberId);
                    
                    // Redirect to member.html with the ID
                    window.location.href = `donateMember.html?id=${newMemberId}&returnUrl=${encodeURIComponent(window.location.href)}`;
                    
                    // This code won't execute immediately due to the redirect
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
     * Opens a modal dialog for member search
     */
    function openMemberSearchDialog() {
        // Create a modal dialog for member search
        const dialog = document.createElement('div');
        dialog.className = 'member-search-dialog';
        
        // Create dialog content
        dialog.innerHTML = `
            <div class="dialog-content">
                <h2>搜索会员</h2>
                <div class="search-container">
                    <input type="text" id="memberSearchInput" placeholder="输入会员姓名或ID搜索...">
                    <button id="searchMemberBtn">搜索</button>
                </div>
                <div id="memberSearchResults" class="search-results"></div>
                <div id="memberSearchPagination" class="pagination"></div>
                <div class="dialog-buttons">
                    <button id="cancelMemberSearch">取消</button>
                </div>
            </div>
        `;
        
        // Apply CSS for the dialog
        const style = document.createElement('style');
        style.textContent = `
            .member-search-dialog {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            }
            .dialog-content {
                background-color: white;
                padding: 20px;
                border-radius: 5px;
                width: 80%;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
            }
            .search-container {
                display: flex;
                margin-bottom: 15px;
            }
            #memberSearchInput {
                flex: 1;
                padding: 8px;
                margin-right: 10px;
            }
            .search-results {
                margin: 15px 0;
                max-height: 50vh;
                overflow-y: auto;
            }
            .member-item {
                padding: 10px;
                border: 1px solid #ddd;
                margin-bottom: 5px;
                cursor: pointer;
            }
            .member-item:hover {
                background-color: #f0f0f0;
            }
            .pagination {
                display: flex;
                justify-content: center;
                margin: 15px 0;
            }
            .pagination button {
                margin: 0 5px;
                padding: 5px 10px;
            }
            .dialog-buttons {
                display: flex;
                justify-content: flex-end;
                margin-top: 15px;
            }
            #searchMemberBtn {
                padding: 8px 15px;
            }
            #cancelMemberSearch {
                padding: 8px 15px;
                background-color: #f0f0f0;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(dialog);
        
        // Get DOM elements
        const searchInput = document.getElementById('memberSearchInput');
        const searchButton = document.getElementById('searchMemberBtn');
        const cancelButton = document.getElementById('cancelMemberSearch');
        const resultsContainer = document.getElementById('memberSearchResults');
        const paginationContainer = document.getElementById('memberSearchPagination');
        
        // Focus the search input
        searchInput.focus();
        
        // Initialize page variables
        let currentPage = 1;
        let totalPages = 1;
        
        // Search function
        async function searchMembers(page = 1, query = '') {
            resultsContainer.innerHTML = '<p>正在搜索...</p>';
            
            try {
                let searchUrl = `../recervingAPI.php?table=members&action=search_member&page=${page}`;
                
                if (query.trim()) {
                    searchUrl += `&name=${encodeURIComponent(query.trim())}`;
                }
                
                const response = await fetch(searchUrl);
                const data = await response.json();
                
                if (data.status === 'success') {
                    // Update pagination info
                    currentPage = data.current_page || 1;
                    totalPages = data.total_pages || 1;
                    
                    // Display results
                    if (data.members && data.members.length > 0) {
                        resultsContainer.innerHTML = '';
                        
                        data.members.forEach(member => {
                            const memberItem = document.createElement('div');
                            memberItem.className = 'member-item';
                            memberItem.innerHTML = `
                                <strong>ID: ${member.membersID || member.id}</strong><br>
                                姓名: ${member.Name || member.CName || '无名称'}<br>
                                联系方式: ${member.ContactNo || member.contact || '无'}
                            `;
                            
                            // Add click handler to select this member
                            memberItem.addEventListener('click', () => {
                                selectMember(member);
                            });
                            
                            resultsContainer.appendChild(memberItem);
                        });
                    } else {
                        resultsContainer.innerHTML = '<p>没有找到会员</p>';
                    }
                    
                    // Update pagination buttons
                    updatePagination();
                } else {
                    resultsContainer.innerHTML = `<p>搜索失败: ${data.message || '未知错误'}</p>`;
                }
            } catch (error) {
                resultsContainer.innerHTML = `<p>搜索出错: ${error.message}</p>`;
            }
        }
        
        // Update pagination buttons
        function updatePagination() {
            paginationContainer.innerHTML = '';
            
            if (totalPages <= 1) return;
            
            // Previous button
            if (currentPage > 1) {
                const prevBtn = document.createElement('button');
                prevBtn.textContent = '上一页';
                prevBtn.addEventListener('click', () => {
                    searchMembers(currentPage - 1, searchInput.value);
                });
                paginationContainer.appendChild(prevBtn);
            }
            
            // Page info
            const pageInfo = document.createElement('span');
            pageInfo.textContent = `${currentPage} / ${totalPages}`;
            pageInfo.style.margin = '0 10px';
            paginationContainer.appendChild(pageInfo);
            
            // Next button
            if (currentPage < totalPages) {
                const nextBtn = document.createElement('button');
                nextBtn.textContent = '下一页';
                nextBtn.addEventListener('click', () => {
                    searchMembers(currentPage + 1, searchInput.value);
                });
                paginationContainer.appendChild(nextBtn);
            }
        }
        
        // Select a member and close the dialog
        function selectMember(member) {
            const memberId = member.membersID || member.id;
            const memberName = member.Name || member.CName || `会员 ID: ${memberId}`;
            
            // Check if this member is already in the dropdown
            let memberOption = Array.from(membershipSelect.options).find(opt => opt.value == memberId);
            
            if (!memberOption) {
                // Add this member to the dropdown
                memberOption = document.createElement('option');
                memberOption.value = memberId;
                memberOption.textContent = `${memberName} (ID: ${memberId})`;
                membershipSelect.appendChild(memberOption);
            }
            
            // Select this member in the dropdown
            membershipSelect.value = memberId;
            
            // Close the dialog
            closeDialog();
        }
        
        // Close the dialog
        function closeDialog() {
            document.body.removeChild(dialog);
        }
        
        // Event listeners
        searchButton.addEventListener('click', () => {
            searchMembers(1, searchInput.value);
        });
        
        // Search when pressing Enter in the search box
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchMembers(1, searchInput.value);
            }
        });
        
        cancelButton.addEventListener('click', closeDialog);
        
        // Initial search (empty query to show all members first page)
        searchMembers(1, '');
    }
});