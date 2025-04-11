const API_BASE_URL = 'http://localhost/projects/C-EnterpriseProject/recervingAPI.php';

document.addEventListener('DOMContentLoaded', function() {
    const donationForm = document.getElementById('donationForm');
    const errorMessages = document.getElementById('errorMessages');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const donationId = new URLSearchParams(window.location.search).get('id');
    const membershipSelect = document.getElementById('membership');
    const newMemberId = new URLSearchParams(window.location.search).get('memberId');

    // 模态框元素
    const memberSearchModal = document.getElementById('memberSearchModal');
    const modalClose = document.querySelector('.close');
    const modalSearchInput = document.getElementById('modalSearchInput');
    const modalSearchButton = document.getElementById('modalSearchButton');
    const modalResultsBody = document.getElementById('modalResultsBody');
    const modalLoadingIndicator = document.getElementById('modalLoadingIndicator');
    const modalNoResults = document.getElementById('modalNoResults');
    const modalPagination = document.getElementById('modalPagination');

    // 模态框变量
    let currentPage = 1;
    const itemsPerPage = 10;
    let totalItems = 0;
    let currentSearchTerm = '';

    // Initialize
    if (donationId) {
        document.getElementById('donationId').value = donationId;
        loadDonationDetails();
    }

    // Handle redirected from member page with new member ID
    if (newMemberId) {
        console.log('Detected new member ID in URL:', newMemberId);
        handleReturnedNewMember(newMemberId);
    }

    // Event Listeners
    donationForm.addEventListener('submit', function(e) {
        e.preventDefault();

        if (validateForm()) {
            submitForm();
        }
    });

    // 模态框事件监听器
    modalClose.addEventListener('click', function() {
        memberSearchModal.style.display = 'none';
    });

    window.addEventListener('click', function(event) {
        if (event.target === memberSearchModal) {
            memberSearchModal.style.display = 'none';
        }
    });

    modalSearchButton.addEventListener('click', function() {
        performModalSearch();
    });

    modalSearchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performModalSearch();
        }
    });
    
    // 添加实时搜索功能 - 在输入时自动搜索
    modalSearchInput.addEventListener('input', function() {
        // 使用延迟执行，避免每次按键都触发搜索
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            performModalSearch();
        }, 300); // 300毫秒延迟
    });

    // Add event listener for membership select to handle old/non member selection
    membershipSelect.addEventListener('change', async function() {
        if (this.value === '1') { // Old Member
            // 直接使用模态框搜索，不再提供独立页面选项
            memberSearchModal.style.display = 'block';
            modalSearchInput.focus();
            modalSearchInput.value = '';
            modalResultsBody.innerHTML = '';
            modalNoResults.style.display = 'none';
            modalPagination.innerHTML = '';
        } else if (this.value === '2') { // Non Member
            // Clear any previously selected member ID
            if (document.getElementById('selectedMemberId')) {
                document.getElementById('selectedMemberId').value = '';
            }
            // Continue with donation form without member association
        }
    });

    // 模态框搜索功能 - 增强版，支持实时搜索
    function performModalSearch(page = 1) {
        const searchTerm = modalSearchInput.value.trim();
        if (!searchTerm) {
            // 清空结果但不显示警告
            modalResultsBody.innerHTML = '';
            modalNoResults.style.display = 'none';
            modalPagination.innerHTML = '';
            return;
        }
        
        currentSearchTerm = searchTerm;
        currentPage = page;
        
        // 显示加载指示器
        modalLoadingIndicator.style.display = 'block';
        modalNoResults.style.display = 'none';
        modalResultsBody.innerHTML = '';
        
        // 从API获取数据 - 修改为与increaseStock.js相同的API调用方式
        fetch(`${API_BASE_URL}?table=members&search=${encodeURIComponent(searchTerm)}&page=${page}&limit=${itemsPerPage}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`搜索失败: ${response.status} - ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                modalLoadingIndicator.style.display = 'none';
                
                const members = data.data; // API返回的数据结构是data.data
                
                if (members && data.total > 0) {
                    displayModalResults(members);
                    totalItems = data.total || members.length;
                    updateModalPagination();
                } else {
                    modalNoResults.style.display = 'block';
                }
            })
            .catch(error => {
                modalLoadingIndicator.style.display = 'none';
                console.error('会员搜索错误:', error);
                alert('搜索会员时出错: ' + error.message);
            });
    }
    
    // 显示模态框搜索结果
    function displayModalResults(members) {
        modalResultsBody.innerHTML = '';
        
        members.forEach(member => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${member.membersID || ''}</td>
                <td>${member.Name || member.CName || '未知'}</td>
                <td>${member.componyName || member.companyName || '未提供'}</td>
                <td>${member.phone_number || '未提供'}</td>
            `;
            
            // 添加点击事件来选择此会员
            row.addEventListener('click', function() {
                selectModalMember(member);
            });
            
            // 添加悬停效果
            row.classList.add('member-row');
            
            modalResultsBody.appendChild(row);
        });
    }
    
    // 选择模态框中的会员
    function selectModalMember(member) {
        const companyName = member.componyName || member.companyName;
        const memberName = member.Name || member.CName;
        const memberId = member.membersID;
        
        console.log('选择会员:', member);
        console.log('会员ID:', memberId);
        
        // 检查会员ID是否有效
        if (!memberId) {
            console.error('无效的会员ID:', memberId);
            alert('选择的会员ID无效，请重新选择');
            return;
        }
        
        // 如果会员同时拥有姓名和公司名称，弹出选择框
        if (companyName && companyName.trim() !== '' && memberName && memberName.trim() !== '') {
            const useCompanyName = confirm('检测到该会员同时拥有姓名和公司名称：\n\n姓名：' + memberName + '\n公司名称：' + companyName + '\n\n点击"确定"使用公司名称，点击"取消"使用姓名');
            document.getElementById('nameCompany').value = useCompanyName ? companyName : memberName;
        } else if (companyName && companyName.trim() !== '') {
            document.getElementById('nameCompany').value = companyName;
        } else {
            document.getElementById('nameCompany').value = memberName || `会员 ID: ${memberId}`;
        }
        
        // 确保selectedMemberId字段存在
        let selectedMemberIdField = document.getElementById('selectedMemberId');
        if (!selectedMemberIdField) {
            selectedMemberIdField = document.createElement('input');
            selectedMemberIdField.type = 'hidden';
            selectedMemberIdField.id = 'selectedMemberId';
            selectedMemberIdField.name = 'memberId';
            donationForm.appendChild(selectedMemberIdField);
        }
        
        // 存储会员ID到隐藏字段 - 保留原始格式，不再转换为数字
        selectedMemberIdField.value = memberId;
        console.log('设置会员ID为:', memberId);
        
        // 将此会员添加为下拉列表中的选项（如果尚不存在）
        let memberExists = false;
        for (let i = 0; i < membershipSelect.options.length; i++) {
            if (membershipSelect.options[i].value === memberId) {
                memberExists = true;
                break;
            }
        }
        
        if (!memberExists) {
            // 为此会员创建新选项
            const newOption = document.createElement('option');
            newOption.value = memberId; // 使用原始membersID，不转换
            newOption.textContent = `${memberName || '未知'} (ID: ${memberId})`;
            
            // 在任何分隔符或特殊选项之前添加选项
            const specialIndex = Array.from(membershipSelect.options).findIndex(opt => 
                opt.value === '1' || opt.value === '2' || opt.disabled);
            
            if (specialIndex !== -1) {
                membershipSelect.insertBefore(newOption, membershipSelect.options[specialIndex]);
            } else {
                membershipSelect.appendChild(newOption);
            }
        }
        
        // 在下拉列表中选择该会员
        membershipSelect.value = memberId;
        
        // 关闭模态框
        memberSearchModal.style.display = 'none';
    }
    
    // 更新模态框分页
    function updateModalPagination() {
        modalPagination.innerHTML = '';
        
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        
        // 上一页按钮
        if (totalPages > 1) {
            const prevButton = document.createElement('button');
            prevButton.innerHTML = '&laquo; 上一页';
            prevButton.disabled = currentPage === 1;
            prevButton.addEventListener('click', function() {
                if (currentPage > 1) {
                    performModalSearch(currentPage - 1);
                }
            });
            modalPagination.appendChild(prevButton);
            
            // 页码按钮
            let startPage = Math.max(1, currentPage - 2);
            let endPage = Math.min(totalPages, startPage + 4);
            
            if (endPage - startPage < 4) {
                startPage = Math.max(1, endPage - 4);
            }
            
            for (let i = startPage; i <= endPage; i++) {
                const pageButton = document.createElement('button');
                pageButton.textContent = i;
                pageButton.classList.toggle('active', i === currentPage);
                pageButton.addEventListener('click', function() {
                    performModalSearch(i);
                });
                modalPagination.appendChild(pageButton);
            }
            
            // 下一页按钮
            const nextButton = document.createElement('button');
            nextButton.innerHTML = '下一页 &raquo;';
            nextButton.disabled = currentPage === totalPages;
            nextButton.addEventListener('click', function() {
                if (currentPage < totalPages) {
                    performModalSearch(currentPage + 1);
                }
            });
            modalPagination.appendChild(nextButton);
        }
    }

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
        console.log('处理返回的会员ID:', memberId);
        
        // 检查memberId是否为undefined或'null'字符串
        if (memberId === undefined || memberId === 'null' || memberId === null) {
            console.log('会员ID为null或undefined，设置为非会员');
            // 只恢复表单数据，不设置会员
            restoreFormDataFromSession();
            // 选择'Non Member'选项
            membershipSelect.value = '2';
            return;
        }
        
        // 检查memberId是否为有效值（不再转换为数字）
        if (!memberId || memberId.trim() === '') {
            console.log('无效的会员ID，设置为非会员');
            restoreFormDataFromSession();
            membershipSelect.value = '2';
            return;
        }
        
        // 恢复之前保存的表单数据
        restoreFormDataFromSession();
        
        // 确保selectedMemberId字段存在
        let selectedMemberIdField = document.getElementById('selectedMemberId');
        if (!selectedMemberIdField) {
            console.log('创建selectedMemberId隐藏字段');
            selectedMemberIdField = document.createElement('input');
            selectedMemberIdField.type = 'hidden';
            selectedMemberIdField.id = 'selectedMemberId';
            selectedMemberIdField.name = 'memberId';
            donationForm.appendChild(selectedMemberIdField);
        }
        
        // 设置selectedMemberId字段的值 - 保留原始格式
        selectedMemberIdField.value = memberId;
        console.log('设置selectedMemberId字段值为:', memberId);
        
        // 获取会员详情以获取名称
        fetch(`${API_BASE_URL}?table=members&action=get_member&id=${memberId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`API请求失败: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('获取到会员详情:', data);
                if (data.status === 'success' && data.member) {
                    const memberName = data.member.Name || data.member.CName || `会员 ID: ${memberId}`;
                    console.log('会员名称:', memberName);
                    
                    // 检查是否已存在此会员的选项
                    let existingOption = null;
                    for (let i = 0; i < membershipSelect.options.length; i++) {
                        if (membershipSelect.options[i].value === memberId) {
                            existingOption = membershipSelect.options[i];
                            break;
                        }
                    }
                    
                    if (existingOption) {
                        console.log('更新现有选项');
                        existingOption.textContent = `${memberName} (ID: ${memberId})`;
                    } else {
                        console.log('创建新选项');
                        // 创建并添加新选项
                        const newOption = document.createElement('option');
                        newOption.value = memberId;
                        newOption.textContent = `${memberName} (ID: ${memberId})`;
                        membershipSelect.appendChild(newOption);
                    }
                    
                    // 选择新选项
                    membershipSelect.value = memberId;
                    console.log('设置下拉框选中值为:', memberId);
                    
                    // 更新表单中的姓名字段
                    const nameCompanyField = document.getElementById('nameCompany');
                    if (nameCompanyField) {
                        nameCompanyField.value = memberName;
                        console.log('更新姓名字段为:', memberName);
                    }
                } else {
                    console.error('API返回错误或无会员数据:', data);
                    showError('无法获取会员详情');
                }
            })
            .catch(error => {
                console.error('获取会员详情失败:', error);
                showError('获取会员详情出错: ' + error.message);
            });
    }

    // Submit form data - UPDATED to handle membership IDs correctly
    async function submitForm() {
        const formData = new FormData(donationForm);
        const data = {};
       
        console.log('Raw form data:');
        for (let pair of formData.entries()) {
            console.log(pair[0] + ': ' + pair[1]);
        }

        const fieldMap = {
            'nameCompany': 'Name/Company_Name',  // Using space as seen in your debug log
            'donationTypes': 'donationTypes',
            'remarks': 'Remarks',
            'receiptNo': 'official_receipt_no',          // As seen in your debug log
            'bank': 'Bank',
            'amount': 'amount',
            'paymentDate': 'paymentDate',
            'donationId': 'ID',
            'membership': 'membership'
        };

        // Add action type
        data.action = donationId ? 'update_donation' : 'add_donation';

        formData.forEach((value, key) => {
            if (fieldMap[key]) {
                const mappedKey = fieldMap[key];
                
                // Handle numeric fields including both donationTypes and Bank
                if ((mappedKey === 'donationTypes' || mappedKey === 'Bank') && value) {
                    data[mappedKey] = parseInt(value);
                    if (isNaN(data[mappedKey])) {
                        throw new Error(`Invalid ${mappedKey} ID`);
                    }
                    console.log(`Converted ${mappedKey} to number:`, data[mappedKey]);
                }
                else if (mappedKey === 'amount' && value) {
                    data[mappedKey] = parseFloat(parseFloat(value).toFixed(2));
                } else {
                    data[mappedKey] = value;
                }
            }
        });

        // Handle membership value from select
        const membershipValue = membershipSelect.value;
        console.log('提交表单时的会员选择值:', membershipValue);
        
        const selectedMemberId = document.getElementById('selectedMemberId')?.value;
        console.log('提交表单时的selectedMemberId值:', selectedMemberId);
        
        // 处理会员身份 - 保持原始格式，不使用parseInt
        if (membershipValue === '2') {
            // 非会员情况下，设置membership为null
            data.membership = null;
            console.log('Non-member selected, setting membership to null');
        } else if (membershipValue === '1') {
            // 老会员选项，但没有具体会员ID
            // 检查是否有selectedMemberId
            if (selectedMemberId && selectedMemberId.trim() !== '') {
                // 保持原始的会员ID格式
                data.membership = selectedMemberId.trim();
                console.log('Using selected member ID for old member:', data.membership);
            } else {
                data.membership = null;
                console.log('No valid member ID for old member, setting to null');
            }
        } else if (selectedMemberId && selectedMemberId.trim() !== '') {
            // 如果有选择具体会员，使用selectedMemberId
            data.membership = selectedMemberId.trim();
            console.log('Using selected member ID:', data.membership);
        } else if (membershipValue && membershipValue !== 'null' && membershipValue !== 'custom') {
            // 直接使用membershipValue作为会员ID，保持原始格式
            if (membershipValue && membershipValue.trim() !== '') {
                data.membership = membershipValue.trim();
                console.log('Using membership value as ID:', data.membership);
            } else {
                data.membership = null;
                console.log('Invalid membership value, setting to null');
            }
        } else {
            // 其他情况下，设置为null
            data.membership = null;
            console.log('No valid membership ID found, setting to null');
        }
        
        // 最后检查一次membership值，确保它不是空字符串
        if (data.membership !== null && data.membership.trim() === '') {
            data.membership = null;
            console.log('Final check: Empty membership ID, setting to null');
        }
        
        console.log('Final data being sent:', JSON.stringify(data));
    

        try {
            showLoading();
            
            // Debug log to check what's being sent to server
            console.log('Sending data to server:', JSON.stringify(data));
            
            const response = await fetch(`${API_BASE_URL}?table=donation`, {
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
                console.error('Response parsing error:', e);
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
            const response = await fetch(`${API_BASE_URL}?table=donation&action=get_donation&id=${donationId}`);

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
    // Initialize dropdowns with options from API
   /* async function initializeDropdowns() {
        try {
            console.log('Fetching dropdown options...');
            const response = await fetch(`${API_BASE_URL}?table=donationtypes&limit=999`);
            const data = await response.json();
            console.log('API Response:', data);
            
            if (data.data && Array.isArray(data.data)) {
                // Populate donation types dropdown with ID and name
                if (data.data.length > 0) {
                    console.log('Donation type options:', data.data);
                    // Clear existing options, keeping only the first default option
                    while (donationTypesSelect.options.length > 1) {
                        donationTypesSelect.remove(1);
                    }
                    
                    // Add options with ID as value and name as text
                    data.data.forEach(item => {
                        const option = document.createElement('option');
                        option.value = item.ID; // Use ID as value
                        option.textContent = item.donationTypes; // Use name as display text
                        donationTypesSelect.appendChild(option);
                    });
                }

                // Make a separate call for bank options
                try {
                    const bankResponse = await fetch(`${API_BASE_URL}?table=bank&limit=999`);
                    const bankData = await bankResponse.json();
                    if (bankData.data && Array.isArray(bankData.data)) {
                        const bankOptions = bankData.data.map(item => item.Bank);
                        if (bankOptions.length > 0) {
                            console.log('Bank options:', bankOptions);
                            populateDropdown(bankSelect, bankOptions);
                        }
                    }
                } catch (bankError) {
                    console.error('Error loading bank options:', bankError);
                }
            }
        } catch (error) {
            console.error('加载下拉选项错误:', error);
            showError('加载选项失败: ' + error.message);
        }
    }*/

    // Update the populateForm function to handle donation type IDs
    function populateForm(donation) {
        document.getElementById('nameCompany').value = donation.donor_name || '';
        // Set donation type by ID
        if (donation.donationTypes) {
            document.getElementById('donationTypes').value = donation.donationTypes;
        }
        
        document.getElementById('bank').value = donation.bank || '';
        
        // Handle membership field with proper display
        if (donation.membership) {
            // 保持membership的原始格式，不再使用parseInt
            const membershipId = donation.membership;
            
            // 确保selectedMemberId字段存在并设置值
            let selectedMemberIdField = document.getElementById('selectedMemberId');
            if (!selectedMemberIdField) {
                selectedMemberIdField = document.createElement('input');
                selectedMemberIdField.type = 'hidden';
                selectedMemberIdField.id = 'selectedMemberId';
                selectedMemberIdField.name = 'memberId';
                donationForm.appendChild(selectedMemberIdField);
            }
            selectedMemberIdField.value = membershipId;
            
            // 检查是否已有此会员ID作为选项
            let memberOption = Array.from(membershipSelect.options).find(opt => opt.value == membershipId);
            
            if (!memberOption) {
                // 如果没有，创建一个新选项
                memberOption = document.createElement('option');
                memberOption.value = membershipId;
                memberOption.textContent = `会员 ID: ${membershipId}`;
                
                // 在预设选项之前添加
                const specialIndex = Array.from(membershipSelect.options).findIndex(opt => 
                    opt.value === '1' || opt.value === '2' || opt.disabled);
                
                if (specialIndex !== -1) {
                    membershipSelect.insertBefore(memberOption, membershipSelect.options[specialIndex]);
                } else {
                    membershipSelect.appendChild(memberOption);
                }
            }
            
            // 选择会员选项
            membershipSelect.value = membershipId;
            
            // 获取会员详情以显示正确的名称
            fetch(`${API_BASE_URL}?table=members&action=get_member&id=${membershipId}`)
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success' && data.member) {
                        const memberName = data.member.Name || data.member.CName || `会员 ID: ${membershipId}`;
                        document.getElementById('nameCompany').value = memberName;
                    }
                })
                .catch(error => console.error('获取会员详情失败:', error));
        } else {
            membershipSelect.value = '2'; // 设为非会员
            if (document.getElementById('selectedMemberId')) {
                document.getElementById('selectedMemberId').value = '';
            }
        }

        // Format payment date if needed
        if (donation.payment_date) {
            const dateOnly = donation.payment_date.split(' ')[0]; // Extract date part if datetime
            document.getElementById('paymentDate').value = dateOnly;
        }

        document.getElementById('receiptNo').value = donation.official_receipt_no || '';
        document.getElementById('amount').value = donation.amount ? parseFloat(donation.amount).toFixed(2) : '';
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
    
    // Add custom type modal elements
    const customDonationTypeModal = document.getElementById('customDonationTypeModal');
    const customBankModal = document.getElementById('customBankModal');
    const addDonationTypeBtn = document.getElementById('addDonationTypeBtn');
    const addBankBtn = document.getElementById('addBankBtn');
    const saveDonationTypeBtn = document.getElementById('saveDonationTypeBtn');
    const saveBankBtn = document.getElementById('saveBankBtn');
    const newDonationType = document.getElementById('newDonationType');
    const newBank = document.getElementById('newBank');

    // Add event listeners only if elements exist
    if (addDonationTypeBtn) {
        addDonationTypeBtn.addEventListener('click', () => {
            if (customDonationTypeModal && newDonationType) {
                customDonationTypeModal.style.display = 'block';
                newDonationType.value = '';
                newDonationType.focus();
            }
        });
    }

    if (addBankBtn) {
        addBankBtn.addEventListener('click', () => {
            if (customBankModal && newBank) {
                customBankModal.style.display = 'block';
                newBank.value = '';
                newBank.focus();
            }
        });
    }

    // Initialize form data from session storage if available
    if (!donationId) {
        restoreFormDataFromSession();
    }
    
    // Initialize dropdowns with options from API
    async function initializeDropdowns() {
        try {
            console.log('Fetching dropdown options...');
            const response = await fetch(`${API_BASE_URL}?table=donationtypes&limit=999`);
            const data = await response.json();
            console.log('API Response:', data);
            
            if (data.data && Array.isArray(data.data)) {
                // Create donation types options with ID as value and name as text
                if (data.data.length > 0) {
                    console.log('Donation type options:', data.data);
                    const donationTypeOptions = data.data.map(item => ({
                        value: item.ID,
                        text: item.donationTypes
                    }));
                    populateDropdown(donationTypesSelect, donationTypeOptions, true);
                }

                // Make a separate call for bank options with high limit
                try {
                    const bankResponse = await fetch(`${API_BASE_URL}?table=bank&limit=999`);
                    const bankData = await bankResponse.json();
                    if (bankData.data && Array.isArray(bankData.data)) {
                        // Map bank data to include both ID and name
                        const bankOptions = bankData.data.map(item => ({
                            value: item.ID,  // Use ID as value
                            text: item.Bank  // Use Bank name as display text
                        }));
                        if (bankOptions.length > 0) {
                            console.log('Bank options:', bankOptions);
                            populateDropdown(bankSelect, bankOptions, true);
                        }
                    }
                } catch (bankError) {
                    console.error('Error loading bank options:', bankError);
                }
            }
        } catch (error) {
            console.error('加载下拉选项错误:', error);
            showError('加载选项失败: ' + error.message);
        }
    }

    // Function to populate dropdown with options
    function populateDropdown(selectElement, options,useObjectFormat = false) {
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
                // For object format where we have separate value and text
                optionElement.value = option.value;
                optionElement.textContent = option.text;
            } else {
                // For simple string format where value equals text
                optionElement.value = option;
                optionElement.textContent = option;
            }
            
            selectElement.appendChild(optionElement);
        });
        
        // Restore previous value if exists
        if (currentValue) {
            // Check if the value still exists in options
            for (let i = 0; i < selectElement.options.length; i++) {
                if (selectElement.options[i].value === currentValue) {
                    selectElement.value = currentValue;
                    break;
                }
            }
        }
    }

    // Call dropdown initialization on page load
    initializeDropdowns();
});

// Delete everything after this line
document.addEventListener('DOMContentLoaded', function() {
    // 添加模态框关闭按钮事件监听器
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });

    // 点击模态框外部关闭
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });

    // 保存乐捐类型按钮事件
    if (saveDonationTypeBtn) {
        saveDonationTypeBtn.addEventListener('click', async function() {
            const newType = document.getElementById('newDonationType').value.trim();
            if (!newType) {
                alert('请输入乐捐类型名称');
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}?table=donationtypes&action=add_type`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        donationTypes: newType,
                        type: 'donation_type'
                    })
                });

                const data = await response.json();
                if (data.status === 'success') {
                     // Important: After adding, get the new type's ID
            const newId = data.id; // Assuming API returns the new ID
            
            // Add option with correct ID value
            const option = document.createElement('option');
            option.value = newId;
            option.textContent = newType;
            donationTypesSelect.appendChild(option);
            
                    donationTypesSelect.appendChild(option);
                    
                    // 选择新添加的选项
                    donationTypesSelect.value = newType;
                    
                    // 关闭模态框
                    document.getElementById('customDonationTypeModal').style.display = 'none';
                    
                    // 显示成功消息
                    alert('添加乐捐类型成功！');
                    
                    // 重新初始化下拉列表
                    await initializeDropdowns();
                } else {
                    throw new Error(data.message || '添加失败');
                }
            } catch (error) {
                alert('添加乐捐类型失败: ' + error.message);
            }
        });
    }

    // 保存银行按钮事件
    if (saveBankBtn) {
        saveBankBtn.addEventListener('click', async function() {
            const newBank = document.getElementById('newBank').value.trim();
            if (!newBank) {
                alert('请输入银行名称');
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}?table=bank&action=add_type`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        Bank: newBank,
                        type: 'bank'
                    })
                });

                const data = await response.json();
                if (data.status === 'success') {
                    // 获取银行下拉列表元素
                    const bankSelect = document.getElementById('bank');
                    
                    // 添加新选项到下拉列表
                    const option = document.createElement('option');
                    option.value = newBank;
                    option.textContent = newBank;
                    bankSelect.appendChild(option);
                    
                    // 选择新添加的选项
                    bankSelect.value = newBank;
                    
                    // 关闭模态框
                    document.getElementById('customBankModal').style.display = 'none';
                    
                    // 刷新页面以重新加载所有选项
                    location.reload();
                    
                    // 显示成功消息
                    alert('添加银行成功！');
                } else {
                    throw new Error(data.message || '添加失败');
                }
            } catch (error) {
                alert('添加银行失败: ' + error.message);
            }
        });
    }
});