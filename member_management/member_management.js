document.addEventListener('DOMContentLoaded', function() {
    const API_BASE_URL = 'http://localhost/projects/C-EnterpriseProject/recervingAPI.php';

    const addMemberForm = document.getElementById('addMemberForm');
    const errorMessages = document.getElementById('errorMessages');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const designation_of_applicant=document.getElementById('designation_of_applicant');
    const selectElement = document.getElementById('expiredDateOptions');
    
    // 获取URL参数中的returnUrl
    const urlParams = new URLSearchParams(window.location.search);
    const returnUrl = urlParams.get('returnUrl');
  
    fetchApplicantType();

  // Add this to your existing code
document.getElementById('expiredDateOptions').addEventListener('change', handleExpiryOptionChange);

// Call it once when the page loads
handleExpiryOptionChange();

    async function fetchApplicantType() {
        try {
            const response = await fetch(`${API_BASE_URL}?table=applicants_types&limit=100`);
            const data = await response.json();
            
            if (data && data.data) {
                // Clear existing options except the first one
                while (designation_of_applicant.options.length > 1) {
                    designation_of_applicant.remove(1);
                }
                
                // Add unique applicant types to the dropdown
                const uniqueApplicant = data.data;
                uniqueApplicant.forEach(item => {
                    const option = document.createElement("option");
                    option.value = item.ID;
                    option.textContent = `${item["designation_of_applicant"]}`;
                    designation_of_applicant.appendChild(option);
                });
            }
        } catch(error) {
            console.error("Error fetching applicant type options:", error);
        }
    }
    function formatDateForDisplay(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
}

    // Form submission handler
    addMemberForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (validateForm()) {
            submitForm();
        }
    });

    // Form validation
    function validateForm() {
        const requiredFields = addMemberForm.querySelectorAll('[required]');
        let isValid = true;
        const errors = [];
        // Reset all error states
        addMemberForm.querySelectorAll('.error').forEach(field => {
            field.classList.remove('error');
        });

        // Check required fields
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                isValid = false;
                errors.push(`${field.previousElementSibling ? field.previousElementSibling.textContent : field.name} 是必填项`);
                field.classList.add('error');
            }
        });

        // Safe element retrieval with fallback
        function safeGetElement(id) {
            const element = document.getElementById(id);
            if (!element) {
                console.warn(`Element with id '${id}' not found`);
            }
            return element;
        }

        // Validate email
        const emailField = safeGetElement('email');
        if (emailField && emailField.value && !isValidEmail(emailField.value)) {
            isValid = false;
            errors.push('邮箱格式不正确');
            emailField.classList.add('error');
        }

        // Validate phone number
        const phoneField = safeGetElement('phone_number');
        if (phoneField && phoneField.value && !isValidPhone(phoneField.value)) {
            isValid = false;
            errors.push('手机号码格式不正确');
            phoneField.classList.add('error');
        }

        // Validate IC number
        const icField = safeGetElement('IC');
        if (icField && icField.value && !isValidIC(icField.value)) {
            isValid = false;
            errors.push('IC号码格式不正确');
            icField.classList.add('error');
        }

        // Validate Birthday
        const birthdayField = safeGetElement('Birthday');
        if (birthdayField && birthdayField.value) {
            const birthdayMonth = new Date(birthdayField.value).getMonth() + 1;
            
            if (isNaN(birthdayMonth) || birthdayMonth < 1 || birthdayMonth > 12) {
                isValid = false;
                errors.push('请输入有效的生日月份');
                birthdayField.classList.add('error');
            }
        }

        // Validate Expired Date
        const expiredDateField = safeGetElement('expired date');
        if (expiredDateField && expiredDateField.value) {
            const expiredDate = new Date(expiredDateField.value);
            const today = new Date();
            
            if (expiredDate < today) {
                isValid = false;
                errors.push('过期日期不能是过去的日期');
                expiredDateField.classList.add('error');
            }
        }

        // Validate Designation
        const designationField = safeGetElement('designation_of_applicant');
        if (designationField) {
            const designationValue = parseInt(designationField.value, 10);
            if (isNaN(designationValue) || designationValue < 1 || designationValue > 7) {
                isValid = false;
                errors.push('Designation must be between 1 and 7');
                designationField.classList.add('error');
            }
        }

        // Validate Place of Birth (added)
        
        
        if (!isValid) {
            showError(errors.join('<br>'));
        } else {
            errorMessages.style.display = 'none';
        }

        return isValid;
    }

    // Modify the handleExpiryOptionChange function
    function handleExpiryOptionChange() {
        const selectedOption = document.getElementById('expiredDateOptions').value;
        const dateInput = document.getElementById('expiredDate');
        const expiryPreview = document.getElementById('expiryDatePreview');
        const today = new Date();
        
        // Hide preview if custom or empty selection
        if (selectedOption === 'custom' || selectedOption === '') {
            if (expiryPreview) {
                expiryPreview.style.display = 'none';
            }
            
            if (selectedOption === 'custom') {
                dateInput.style.display = 'block';
                dateInput.value = ''; // Clear any existing date
            } else {
                dateInput.style.display = 'none';
            }
            return;
        }
        
        // Calculate expiry date based on selection
        let expiryDate;
        if (selectedOption === '1year') {
            expiryDate = new Date(today);
            expiryDate.setFullYear(today.getFullYear() + 1);
            expiryDate.setDate(expiryDate.getDate() - 1);
        } else if (selectedOption === '2year') {
            expiryDate = new Date(today);
            expiryDate.setFullYear(today.getFullYear() + 2);
            expiryDate.setDate(expiryDate.getDate() - 1);
        } else if (selectedOption === '3years') {
            expiryDate = new Date(today);
            expiryDate.setFullYear(today.getFullYear() + 3);
            expiryDate.setDate(expiryDate.getDate() - 1);
        }
        
        // Format and update display
        if (expiryDate) {
            // Format date as YYYY-MM-DD for the input field
            const year = expiryDate.getFullYear();
            const month = String(expiryDate.getMonth() + 1).padStart(2, '0');
            const day = String(expiryDate.getDate()).padStart(2, '0');
            
            // Update date input
            dateInput.value = `${year}-${month}-${day}`;
            dateInput.style.display = 'block';
            
            // Show date preview in DD/MM/YYYY format
            if (expiryPreview) {
                expiryPreview.textContent = `${day}/${month}/${year}`;
                expiryPreview.style.display = 'block';
            }
        }
    }
    
    // Helper function to format and set date
    function setDateValue(date) {
        const dateInput = document.getElementById('expiredDate');
        // Format date as YYYY-MM-DD for the input field
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        dateInput.value = `${year}-${month}-${day}`;
    }

    // Submit form data
    async function submitForm() {
        
        const formData = new FormData(addMemberForm);
        const data = {};

        
        formData.forEach((value, key) => {
            console.log(`${key}: ${value}`);
            if (value.trim() !== '') {
                data[key] = value.trim();
            }
        });

        data.action = 'add_member';

        // Debug logging
        console.log ('Submitting JSON data:', JSON.stringify(data, null, 2));

     

        try {
            showLoading();
            const response = await fetch('../recervingAPI.php?table=members', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

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
                alert('会员添加成功！');
                
                // 获取会员类型
                const designationType = parseInt(data['Designation of Applicant'], 10);
                
                // 如果有returnUrl参数，则跳转回原页面并根据会员类型决定是否带上新会员ID
                if (returnUrl) {
                    // 构建URL
                    const redirectUrl = new URL(returnUrl);
                    
                    // 如果会员类型是Member(1)或Foreigner(3)，则返回memberId
                    if (designationType === 1 || designationType === 3) {
                        redirectUrl.searchParams.set('memberId', parsedData.memberId);
                    } else {
                        // 其他类型返回null
                        redirectUrl.searchParams.set('memberId', 'null');
                    }
                    
                    window.location.href = redirectUrl.toString();
                } else {
                    // 默认跳转到会员搜索页面
                    window.location.href = 'member_search.html?add=success&id=' + parsedData.memberId;
                }
            } else {
                showError('添加会员失败: ' + (parsedData.message || '未知错误'));
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

    // Helper functions
    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function isValidPhone(phone) {
        return /^\+?[\d\s-]{8,}$/.test(phone);
    }

    function isValidIC(ic) {
        return /^[\d-]{6,}$/.test(ic);
    }

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

    
});