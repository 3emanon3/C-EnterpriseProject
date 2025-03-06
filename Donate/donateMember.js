document.addEventListener('DOMContentLoaded', function() {
    const addMemberForm = document.getElementById('addMemberForm');
    const errorMessages = document.getElementById('errorMessages');
    const loadingIndicator = document.getElementById('loadingIndicator');


    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('add') === 'success') {
        const memberId = urlParams.get('id');
        if (memberId) {
            // Fetch and display the complete member data
            fetchMemberDetails(memberId);
        }
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
            if (isNaN(designationValue) || designationValue < 1 || designationValue > 6) {
                isValid = false;
                errors.push('Designation must be between 1 and 6');
                designationField.classList.add('error');
            }
        }

        // Validate Place of Birth (added)
        const placeOfBirthField = safeGetElement('place of birth');
        if (placeOfBirthField && !placeOfBirthField.value.trim()) {
            isValid = false;
            errors.push('出生地不能为空');
            placeOfBirthField.classList.add('error');
        }
        
        if (!isValid) {
            showError(errors.join('<br>'));
        } else {
            errorMessages.style.display = 'none';
        }

        return isValid;
    }

    // Submit form data
    async function submitForm() {
        const formData = new FormData(addMemberForm);
        const data = {};

        console.log('Final processed data:', JSON.stringify(data, null, 2));
        
        console.log('Raw Form Data:');
        for (let [key, value] of formData.entries()) {
            console.log(`${key}: ${value}`);
        }

        // Modify the existing form data processing section
    formData.forEach((value, key) => {
   
    let processedValue = value.trim(); // Trim whitespace


    // Ensure the field is not empty before adding to data
    if (processedValue !== '') {
        data[key] = processedValue;
    }
});

        data.action = 'add_member';

        // Debug logging
        console.log('Submitting JSON data:', JSON.stringify(data, null, 2));

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
                window.location.href = 'member_search.html?add=success&id=' + parsedData.memberId;
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