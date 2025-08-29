// member_management.js
document.addEventListener('DOMContentLoaded', function() {
    // API endpoint configuration
    const API_BASE_URL = '../recervingAPI.php';
    let isLeaving = false;
    let formChanged = false; // Track if the user has made any changes

    // Main form elements
    const addMemberForm = document.getElementById('addMemberForm');
    const errorMessages = document.getElementById('errorMessages');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const designation_of_applicant = document.getElementById('designation_of_applicant');
    const expiredDateOptions = document.getElementById('expiredDateOptions');

    // Modal elements for adding applicant type
    const addTypeModal = document.getElementById('addTypeModal'); // The overlay
    const addApplicantTypeBtn = document.getElementById('addApplicantTypeBtn'); // The '+' button
    const saveNewTypeBtn = document.getElementById('saveNewTypeBtn');
    const cancelNewTypeBtn = document.getElementById('cancelNewTypeBtn');
    const newApplicantTypeNameInput = document.getElementById('newApplicantTypeName');
    const modalErrorMessages = document.getElementById('modalErrorMessages');
    const modalLoadingIndicator = document.getElementById('modalLoadingIndicator');

    // Success modal element
    const successModal = document.getElementById('successModal');

    // Get return URL from query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const returnUrl = urlParams.get('returnUrl');

    // Add beforeunload event listener to confirm when leaving with unsaved changes
    window.addEventListener('beforeunload', function (e) {
        if (!isLeaving && formChanged) {
            e.returnValue = '确定要取消吗？您的更改可能不会被保存。';
        }
    });

    // --- Crucial Check: Ensure elements are found ---
    if (!addApplicantTypeBtn) {
        console.error("Error: Button with ID 'addApplicantTypeBtn' not found!");
        return; // Stop script execution if button is missing
    }
    if (!addTypeModal) {
        console.error("Error: Modal overlay with ID 'addTypeModal' not found!");
        return; // Stop script execution if modal is missing
    }
    // --- End Crucial Check ---

    // Initial data fetch
    fetchApplicantType();

    // Event listeners
    addMemberForm.addEventListener('submit', handleMainFormSubmit);
    expiredDateOptions.addEventListener('change', handleExpiryOptionChange);

    // --- Event Listeners for Modal ---
    // Add listener to the '+' button to open the modal
    addApplicantTypeBtn.addEventListener('click', openAddTypeModal);

    // Add listener to the 'Cancel' button inside the modal
    cancelNewTypeBtn.addEventListener('click', closeAddTypeModal);

    // Add listener to the 'Save' button inside the modal
    saveNewTypeBtn.addEventListener('click', handleSaveNewType);

    // Add listener to the modal overlay to close if clicked outside the content
    addTypeModal.addEventListener('click', (event) => {
        // Check if the click was directly on the overlay (event.target)
        // and not on its children (like the modal-content)
        if (event.target === addTypeModal) {
            closeAddTypeModal();
        }
    });
    // --- End Event Listeners for Modal ---

    // Track form changes
    const formInputs = addMemberForm.querySelectorAll('input, textarea, select');
    formInputs.forEach(input => {
        input.addEventListener('change', function() {
            formChanged = true;
        });
        input.addEventListener('input', function() {
            formChanged = true;
        });
    });

    // Initialize expiry date handling
    handleExpiryOptionChange();
    
    // Reset formChanged after initialization
    formChanged = false;

    // Function to handle back button click with confirmation
    window.goBack = function() {
        if (formChanged) {
            showConfirmModal();
        } else {
            isLeaving = true;
            window.location.href = 'member_search.html';
        }
    };

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
    window.hideConfirmModal = function() {
        const modal = document.getElementById('confirmModal');
        modal.classList.remove('show');
        
        // Wait for animation to complete before hiding
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    };

    // Function to confirm and redirect
    window.confirmRedirect = function() {
        hideConfirmModal();
        
        // Wait for modal to close before redirecting
        setTimeout(() => {
            isLeaving = true;
            window.location.href = 'member_search.html';
        }, 300);
    };

    // Function to show success modal with animation
    function showSuccessModal(message) {
        // Set message content if provided
        if (message) {
            const messageEl = successModal.querySelector('.modal-message');
            if (messageEl) messageEl.textContent = message;
        }
        
        // Show the modal
        successModal.style.display = 'flex';
        
        // Trigger animation
        setTimeout(() => {
            successModal.classList.add('show');
        }, 10);
    }

    // Function to hide success modal
    window.hideSuccessModal = function() {
        successModal.classList.remove('show');
        
        // Wait for animation to complete before hiding
        setTimeout(() => {
            successModal.style.display = 'none';
        }, 300);
    };

    // Function to confirm success and redirect
    window.successRedirect = function(url) {
        hideSuccessModal();
        
        // Wait for modal to close before redirecting
        setTimeout(() => {
            isLeaving = true;
            window.location.href = url;
        }, 300);
    };

    /**
     * Fetches applicant types from the API and populates the dropdown.
     */
    async function fetchApplicantType() {
        console.log("Fetching applicant types...");
        // Clear existing options first to prevent duplicates if called multiple times
        const currentSelectedValue = designation_of_applicant.value;
        while (designation_of_applicant.options.length > 1) {
             designation_of_applicant.remove(1);
        }

        try {
            const response = await fetch(`${API_BASE_URL}?table=applicants_types&limit=100`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();

            if (data && data.data) {
                data.data.forEach(item => {
                    const option = document.createElement("option");
                    option.value = item.ID;
                    option.textContent = item.designation_of_applicant;
                    designation_of_applicant.appendChild(option);
                });
                // Restore selection if possible
                if (designation_of_applicant.querySelector(`option[value="${currentSelectedValue}"]`)) {
                    designation_of_applicant.value = currentSelectedValue;
                }
                console.log("Applicant types populated.");
            } else {
                console.warn("No applicant types data received:", data);
            }
        } catch(error) {
            console.error("Error fetching applicant type options:", error);
            showError("无法加载塾员种类，请检查网络或联系管理员。");
        }
    }

    /**
     * Handles the submission of the main member form.
     */
    function handleMainFormSubmit(e) {
        e.preventDefault();
        if (validateForm()) {
            submitMainForm();
        }
    }

    /**
     * Validates the main member form fields.
     * @returns {boolean} True if the form is valid, false otherwise.
     */
    function validateForm() {
        const requiredFields = addMemberForm.querySelectorAll('[required]');
        let isValid = true;
        const errors = [];

        // Reset previous errors visually and the error list
        addMemberForm.querySelectorAll('.error').forEach(field => field.classList.remove('error'));
        errorMessages.style.display = 'none';
        errorMessages.innerHTML = '';

        requiredFields.forEach(field => {
            // Check both value and, for selects, if the value is not empty
            if (!field.value || (field.tagName === 'SELECT' && field.value === "")) {
                isValid = false;
                // Try to get the label text more reliably
                const labelElement = field.closest('.form-group')?.querySelector('label');
                const labelText = labelElement ? labelElement.textContent.replace('*', '').trim() : field.name;
                errors.push(`${labelText} 是必填项`);
                field.classList.add('error'); // Add error class for styling
            }
        });

        // --- Add your specific field validations here ---
        const emailField = document.getElementById('email');
    
        const phoneField = document.getElementById('phone_number');
        
        const expiredDateField = document.getElementById('expiredDate');
        
        const expiredOption = document.getElementById('expiredDateOptions').value;

        // Validate expired date only if it's visible and has a value
        if (expiredDateField && expiredDateField.style.display !== 'none' && expiredDateField.value) {
            const expiredDate = new Date(expiredDateField.value);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Compare date part only
            if (expiredDate < today) {
                isValid = false; errors.push('过期日期不能早于今天'); expiredDateField.classList.add('error');
            }
        } else if (expiredDateField && expiredDateField.style.display !== 'none' && !expiredDateField.value && expiredDateOptions.value !== '' && expiredDateOptions.value !== 'custom') {
             // If a duration (1/2/3 years) was selected but somehow the date is empty (shouldn't happen with current logic, but good check)
             isValid = false; errors.push('未能计算到期日期，请重新选择'); expiredDateField.classList.add('error');
        }
         // --- End specific field validations ---

        if (!isValid) {
            showError(errors.join('<br>')); // Display errors
        }

        return isValid;
    }

     /**
     * Submits the main member form data to the API.
     */
    async function submitMainForm() {
        const formData = new FormData(addMemberForm);
        const data = {};
        formData.forEach((value, key) => {
             if (value.trim() !== '') { // Only include non-empty fields
                data[key] = value.trim();
            }
        });

        // Ensure expired_date is correctly handled
        const expiredDateInput = document.getElementById('expiredDate');
        if (expiredDateInput.style.display !== 'none' && expiredDateInput.value) {
            data['expired_date'] = expiredDateInput.value;
        } else {
             // Explicitly set to null if not provided or hidden
             data['expired_date'] = null;
        }

        data.action = 'add_member';

        console.log('Submitting main form data:', JSON.stringify(data, null, 2));
        showLoading(loadingIndicator);

        try {
            const response = await fetch(`${API_BASE_URL}?table=members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const rawResponse = await response.text();
            console.log('Raw API Response (Add Member):', rawResponse);
            let parsedData;
            try { parsedData = JSON.parse(rawResponse); } catch (e) { throw new Error('API返回格式错误: ' + rawResponse); }

            if (parsedData.status === 'success' && parsedData.ids && parsedData.ids.length > 0) {
                const memberId = parsedData.ids[0];
                
                // Set isLeaving to true to prevent unsaved changes warning
                isLeaving = true;
                
                // Show success modal instead of alert
                showSuccessModal('塾员添加成功！');
                
                // Handle redirection with delay
                const designationType = parseInt(data['Designation_of_Applicant'], 10);
                
                // Prepare redirect URL
                let redirectUrl;
                if (returnUrl) {
                    redirectUrl = new URL(returnUrl);
                    if (designationType === 1 || designationType === 3) {
                        redirectUrl.searchParams.set('memberId', parsedData.memberId);
                    } else {
                        redirectUrl.searchParams.set('memberId', 'null');
                    }
                    redirectUrl = redirectUrl.toString();
                } else {
                    redirectUrl = `member_search.html?add=success&id=${memberId}`;
                }
                
                // Add click handler for success modal's confirm button
                const confirmBtn = successModal.querySelector('.confirm-btn');
                if (confirmBtn) {
                    confirmBtn.onclick = function() {
                        successRedirect(redirectUrl);
                    };
                }
                
                // Automatically redirect after 3 seconds if user doesn't click
                setTimeout(() => {
                    if (successModal.style.display === 'flex') {
                        successRedirect(redirectUrl);
                    }
                }, 3000);
            } else {
                throw new Error(parsedData.message || parsedData.error || '添加塾员失败，未知错误');
            }
        } catch (error) {
            console.error('Error submitting main form:', error);
            showError('提交失败: ' + error.message); // Show error on main form
        } finally {
            hideLoading(loadingIndicator);
        }
    }

    // --- Modal Handling Functions ---

    /**
     * Opens the modal to add a new applicant type.
     */
    function openAddTypeModal() {
        console.log("Opening Add Type Modal..."); // Debug log
        // Reset modal state before showing
        newApplicantTypeNameInput.value = '';
        modalErrorMessages.textContent = ''; // Clear previous errors
        modalErrorMessages.style.display = 'none';
        newApplicantTypeNameInput.classList.remove('error');
        saveNewTypeBtn.disabled = false; // Ensure buttons are enabled
        cancelNewTypeBtn.disabled = false;

        // Show the modal overlay
        addTypeModal.style.display = 'flex'; // Use flex to enable centering via CSS
        newApplicantTypeNameInput.focus(); // Focus the input field
    }

    /**
     * Closes the modal for adding a new applicant type.
     */
    function closeAddTypeModal() {
        console.log("Closing Add Type Modal..."); // Debug log
        addTypeModal.style.display = 'none'; // Hide the modal overlay
    }

    /**
     * Handles saving the new applicant type entered in the modal.
     */
    async function handleSaveNewType() {
        const newTypeName = newApplicantTypeNameInput.value.trim();

        // Reset modal errors
        modalErrorMessages.style.display = 'none';
        newApplicantTypeNameInput.classList.remove('error');

        if (!newTypeName) {
            showModalError('新种类名称不能为空。');
            newApplicantTypeNameInput.classList.add('error');
            newApplicantTypeNameInput.focus();
            return;
        }

        const data = {
            action: 'add_applicant_type',
            designation_of_applicant: newTypeName
        };

        console.log('Submitting new applicant type:', JSON.stringify(data));
        showLoading(modalLoadingIndicator);
        saveNewTypeBtn.disabled = true;
        cancelNewTypeBtn.disabled = true;

        try {
            const response = await fetch(`${API_BASE_URL}?table=applicants_types`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const rawResponse = await response.text();
            console.log('Raw API Response (Add Type):', rawResponse);
            let parsedData;
            try { parsedData = JSON.parse(rawResponse); } catch (e) { throw new Error('API返回格式错误: ' + rawResponse); }


            if (parsedData.status === 'success') {
                alert('新种类添加成功！');
                closeAddTypeModal();
                // Refresh the dropdown and potentially select the new item
                await fetchApplicantType(); // Use await to ensure fetch completes
                if (parsedData.newTypeId) {
                     // Wait a tiny moment for the DOM to update after fetch, then select
                     setTimeout(() => {
                         designation_of_applicant.value = parsedData.newTypeId;
                         console.log(`Selected new type ID: ${parsedData.newTypeId}`);
                     }, 100); // 100ms delay, adjust if needed
                }
            } else {
                 // Throw an error to be caught below
                 throw new Error(parsedData.message || parsedData.error || '添加种类失败，未知错误');
            }
        } catch (error) {
            console.error('Error saving new applicant type:', error);
            showModalError('保存失败: ' + error.message); // Show error in modal
        } finally {
            hideLoading(modalLoadingIndicator);
            saveNewTypeBtn.disabled = false;
            cancelNewTypeBtn.disabled = false;
        }
    }

    // --- Helper Functions ---

    /**
     * Handles changes in the expiry date duration selection, based on payment date.
     */
    function handleExpiryOptionChange() {
        const selectedOption = expiredDateOptions.value;
        const dateInput = document.getElementById('expiredDate');
        const todayString = new Date().toISOString().split('T')[0];

        if (selectedOption === 'custom') {
            dateInput.style.display = 'block';
            dateInput.min = todayString; // Set min date to today
        } else if (selectedOption === '') {
            dateInput.style.display = 'none';
            dateInput.value = '';
        } else { // For '1year', '2year', '3years'
            dateInput.style.display = 'block'; // Ensure it's visible

            // Calculate from today's date
            const baseDate = new Date();
            let expiryDate = new Date(baseDate);

            if (selectedOption === '1year') expiryDate.setFullYear(baseDate.getFullYear() + 1);
            else if (selectedOption === '2year') expiryDate.setFullYear(baseDate.getFullYear() + 2);
            else if (selectedOption === '3years') expiryDate.setFullYear(baseDate.getFullYear() + 3);

            expiryDate.setDate(expiryDate.getDate() - 1); // One day less for exact duration

            dateInput.value = expiryDate.toISOString().split('T')[0]; // Set YYYY-MM-DD
            dateInput.min = todayString;
        }
    }

    /**
     * Validates email format.
     */

    /**
     * Validates phone number format (basic).
     */
    function isValidPhone(phone) { return /^\+?[\d\s-()]{7,}$/.test(phone); }

    /**
     * Displays error messages on the main form.
     */
    function showError(message) {
        errorMessages.innerHTML = message;
        errorMessages.style.display = 'block';
        errorMessages.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    /**
     * Displays error messages within the modal.
     */
    function showModalError(message) {
        modalErrorMessages.textContent = message;
        modalErrorMessages.style.display = 'block';
    }

    /**
     * Shows a specific loading indicator.
     */
    function showLoading(indicator) {
        if (indicator) indicator.style.display = 'block';
    }

    /**
     * Hides a specific loading indicator.
     */
    function hideLoading(indicator) {
         if (indicator) indicator.style.display = 'none';
    }

}); // End DOMContentLoaded