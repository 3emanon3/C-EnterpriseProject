document.addEventListener('DOMContentLoaded', function() {
    const addMemberForm = document.getElementById('addMemberForm');
    const errorMessages = document.getElementById('errorMessages');
    const loadingIndicator = document.getElementById('loadingIndicator');



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
                errors.push(`${field.previousElementSibling.textContent} 是必填项`);
                field.classList.add('error');
            }
        });

        // Validate email format
        const emailField = document.getElementById('email');
        if (emailField.value && !isValidEmail(emailField.value)) {
            isValid = false;
            errors.push('邮箱格式不正确');
            emailField.classList.add('error');
        }

        // Validate phone number
        const phoneField = document.getElementById('phone_number');
        if (phoneField.value && !isValidPhone(phoneField.value)) {
            isValid = false;
            errors.push('手机号码格式不正确');
            phoneField.classList.add('error');
        }

        // Validate IC number
        const icField = document.getElementById('IC');
        if (icField.value && !isValidIC(icField.value)) {
            isValid = false;
            errors.push('IC号码格式不正确');
            icField.classList.add('error');
        }

        // Validate dates
        const birthdayField = document.getElementById('Birthday');
        const expiredDateField = document.getElementById('expired_date');
        
        if (birthdayField.value && new Date(birthdayField.value) > new Date()) {
            isValid = false;
            errors.push('生日不能是将来的日期');
            birthdayField.classList.add('error');
        }

        if (expiredDateField.value && new Date(expiredDateField.value) < new Date()) {
            isValid = false;
            errors.push('过期日期不能是过去的日期');
            expiredDateField.classList.add('error');
        }

     // Validate Designation
       const designationField = document.getElementById('designation_of_applicant');
       if (!designationField) {
        console.error("Element 'designation_of_applicant' not found.");
        return false;
    }
       const designationValue = designationField.value;
        if (designationValue < 1 || designationValue > 4) {
        isValid = false;
       errors.push('Designation must be between 1 and 4');
       designationField.classList.add('error');
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
    
        formData.forEach((value, key) => {
            data[key] = value;
        });
    
        data.action = 'add_member';
    
        // Debug: Log the JSON data to be sent
        console.log('Submitting JSON data:', JSON.stringify(data, null, 2));
    
        try {
            showLoading();
            const response = await fetch('../recervingAPI.php?table=members', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'  // Ensure the Content-Type is application/json
                },
                body: JSON.stringify(data)  // Send data as JSON
            });
    
            // Debug: Log raw response
            const rawResponse = await response.text();
            console.log('Raw API Response:', rawResponse);
    
            // Try to parse as JSON
            let parsedData;
            try {
                parsedData = JSON.parse(rawResponse);
            } catch (e) {
                showError('API返回格式错误: ' + rawResponse);
                return;
            }
    
            if (parsedData.status === 'success') {
                alert('会员添加成功！');
                window.location.href = 'member_search.html';
            } else {
                showError('添加会员失败: ' + (parsedData.message || '未知错误'));
                // Debug: Log error details if available
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
        // Adjust this regex based on your IC number format requirements
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