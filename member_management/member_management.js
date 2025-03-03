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
        
        if (birthdayField.value) {
            // Extract just the month from the date
            const birthdayMonth = new Date(birthdayField.value).getMonth() + 1; // getMonth() returns 0-11
            
            // Validate if it's a valid month (1-12)
            if (isNaN(birthdayMonth) || birthdayMonth < 1 || birthdayMonth > 12) {
                isValid = false;
                errors.push('请输入有效的生日月份');
                birthdayField.classList.add('error');
            }
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
        if (designationValue < 1 || designationValue > 5) {
        isValid = false;
       errors.push('Designation must be between 1 and 5');
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
    

        console.log('Raw place_of_birth:', formData.get('place_of_birth'));
    console.log('Raw expired_date:', formData.get('expired_date'));
    

        formData.forEach((value, key) => {
                // Make sure ALL fields are included in the data object
        data[key] = value;
        let standardizedKey = key;
    
        // Example of standardizing field names
        if (key === 'place_of_birth') standardizedKey = 'placeOfBirth';
        if (key === 'expired_date') standardizedKey = 'expiredDate';
        if (key === 'designation_of_applicant') standardizedKey = 'designationOfApplicant';
        
        data[standardizedKey] = value;
            if (key === 'Birthday' && value) {
                // Convert the full date to just month (1-12)
                const monthOnly = new Date(value).getMonth() + 1;
                data[key] = monthOnly.toString(); // Convert to string for consistency
            } else if   (key === 'expired_date' && value) {
            // Convert expired_date to YYYY-MM-DD format
         
             try {
                const dateValue = value.trim();
                // Check if the date is in YYYY-MM-DD format
                if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
                    data[key] = dateValue; // Already in correct format
                } else {
                    // Try to parse and convert
                    const date = new Date(dateValue);
                    if (!isNaN(date.getTime())) { // Valid date
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        data[key] = `${year}-${month}-${day}`;
                    } else {
                        // Invalid date, use original to avoid losing data
                        console.error('Invalid date format for expired_date:', dateValue);
                        data[key] = dateValue;
                    }
                }
            } catch (e) {
                console.error('Error processing expired_date:', e);
                data[key] = value; // Keep original value on error
            }
        } else if (key === 'designation_of_applicant') {
            // Ensure designation is sent as a number
            data[key] = parseInt(value, 10);
        }  else {
                data[key] = value;
            }
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
                window.location.href = 'member_search.html?add=success&id=' + parsedData.memberId;
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