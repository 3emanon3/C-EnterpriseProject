// edit_member.js

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM fully loaded. Initializing edit_member page...');

    // API endpoint configuration (Keep your existing one)
    const API_BASE_URL = 'http://localhost/projects/C-EnterpriseProject/recervingAPI.php';

    // --- Selectors for elements based on NEW HTML structure ---
    const memberForm = document.getElementById('memberForm');
    const errorMessages = document.getElementById('errorMessages'); // Main form errors
    const loadingIndicator = document.getElementById('loadingIndicator'); // Main loading indicator
    const designationSelect = document.getElementById('designation_of_applicant');
    const expiredDateOptions = document.getElementById('expiredDateOptions'); // Expiry dropdown
    const expiredDateInput = document.getElementById('expiredDate'); // Expiry date input
    const memberIdField = document.getElementById('memberId'); // Member ID input
    const printButton = document.getElementById('printButton'); // Print button

    // Modal elements (copied from member_management.js)
    const addTypeModal = document.getElementById('addTypeModal');
    const addApplicantTypeBtn = document.getElementById('addApplicantTypeBtn'); // '+' button
    const saveNewTypeBtn = document.getElementById('saveNewTypeBtn');
    const cancelNewTypeBtn = document.getElementById('cancelNewTypeBtn');
    const newApplicantTypeNameInput = document.getElementById('newApplicantTypeName');
    const modalErrorMessages = document.getElementById('modalErrorMessages'); // Modal errors
    const modalLoadingIndicator = document.getElementById('modalLoadingIndicator'); // Modal loading

    // --- Crucial Check: Ensure elements are found ---
    if (!memberForm || !errorMessages || !loadingIndicator || !designationSelect || !expiredDateOptions || !expiredDateInput || !memberIdField) {
        console.error("FATAL: One or more essential form elements not found!");
        alert("页面加载错误：缺少必要的表单元素。请刷新或联系管理员。");
        return; // Stop script execution
    }
    if (!addApplicantTypeBtn || !addTypeModal || !saveNewTypeBtn || !cancelNewTypeBtn || !newApplicantTypeNameInput || !modalErrorMessages || !modalLoadingIndicator) {
        console.error("FATAL: One or more essential modal elements not found!");
        // Don't necessarily stop execution, but log the error
        // alert("页面加载警告：添加种类的模态框元素不完整。");
    }
    // --- End Crucial Check ---


    // --- Helper Functions (Copied/Adapted from member_management.js & existing edit_member.js) ---

    const makeApiUrl = (table) => `${API_BASE_URL}?table=${encodeURIComponent(table)}`;

    const handleApiResponse = async (response) => {
        const responseText = await response.text();
        console.log('API Response Status:', response.status);
        console.log('API Response Body Snippet:', responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''));

        if (!response.ok) {
            console.error('API Error Response:', { status: response.status, statusText: response.statusText, body: responseText });
            // Try to parse error message from JSON if possible
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
                const errorJson = JSON.parse(responseText);
                errorMessage = errorJson.message || errorJson.error || errorMessage;
            } catch (e) {
                // Ignore if parsing fails, use default error
            }
            throw new Error(errorMessage);
        }

        try {
            return JSON.parse(responseText);
        } catch (error) {
            console.error('Failed to parse response:', responseText);
            throw new Error('服务器返回无效的数据格式');
        }
    };

    function formatDate(dateString) {
        if (!dateString || dateString === '0000-00-00' || dateString.startsWith('0001-')) return ''; // Handle invalid or zero dates
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                 // Try parsing YYYY-MM-DD specifically
                 if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
                    const parts = dateString.split('-');
                    const validDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])); // Use UTC to avoid timezone issues
                    if (!isNaN(validDate.getTime())) {
                        return dateString;
                    }
                 }
                console.warn(`Invalid dateString received: ${dateString}`);
                return '';
            }
            // Use UTC methods to avoid timezone shifts when formatting
            const year = date.getUTCFullYear();
            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
            const day = String(date.getUTCDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (e) {
            console.error(`Error formatting date: ${dateString}`, e);
            return '';
        }
    }

    function isValidDateFormat(dateString) {
        return dateString === '' || /^\d{4}-\d{2}-\d{2}$/.test(dateString);
    }

    function getMonthFromBirthday(birthdayData) {
        if (birthdayData === null || birthdayData === undefined || birthdayData === '') return '';
        let monthNum;
        if (typeof birthdayData === 'number') {
            monthNum = birthdayData;
        } else if (typeof birthdayData === 'string' && /^\d+$/.test(birthdayData)) {
            monthNum = parseInt(birthdayData, 10);
        } else { return ''; }
        return (monthNum >= 1 && monthNum <= 12) ? monthNum.toString() : '';
    }

    // Error and Loading Helpers (from member_management.js)
    function showError(message) {
        errorMessages.innerHTML = message;
        errorMessages.style.display = 'block';
        errorMessages.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function showModalError(message) {
        if (modalErrorMessages) {
            modalErrorMessages.textContent = message;
            modalErrorMessages.style.display = 'block';
        } else {
            console.error("Modal error display element not found, showing alert instead:", message);
            alert("模态框错误: " + message);
        }
    }

    function showLoading(indicator) {
        if (indicator) indicator.style.display = 'block';
    }

    function hideLoading(indicator) {
        if (indicator) indicator.style.display = 'none';
    }

    // --- Designation/Applicant Type Handling (Modal Approach) ---

    /**
     * Fetches applicant types from the API and populates the dropdown.
     * Replaces the old loadDesignations logic.
     */
    async function fetchApplicantType() {
        console.log("Fetching applicant types...");
        const currentSelectedValue = designationSelect.value;
        // Clear existing options (keep the first placeholder)
        while (designationSelect.options.length > 1) {
            designationSelect.remove(1);
        }

        try {
            // Fetch all types
            const response = await fetch(`${API_BASE_URL}?table=applicants_types&limit=200`);
            const data = await handleApiResponse(response);

            if (data && data.data) {
                data.data.forEach(item => {
                    // Ensure item and its properties exist
                    if (item && item.ID != null && item.designation_of_applicant != null) {
                        const option = document.createElement("option");
                        option.value = item.ID.toString(); // Ensure value is string
                        option.textContent = item.designation_of_applicant;
                        designationSelect.appendChild(option);
                    } else {
                        console.warn("Skipping invalid applicant type item:", item);
                    }
                });
                // Restore selection if possible
                if (designationSelect.querySelector(`option[value="${currentSelectedValue}"]`)) {
                    designationSelect.value = currentSelectedValue;
                } else if (currentSelectedValue) {
                    console.warn(`Previously selected designation ID ${currentSelectedValue} not found after refresh.`);
                    // Optionally set back to placeholder or leave as is
                     designationSelect.value = ""; // Set back to placeholder
                }
                console.log("Applicant types populated.");
            } else {
                console.warn("No applicant types data received or data format incorrect:", data);
                showError("无法加载塾员种类列表。"); // Show error on main form
            }
        } catch (error) {
            console.error("Error fetching applicant type options:", error);
            showError(`无法加载塾员种类：${error.message}`);
        }
    }

    // Modal Handling Functions (Copied from member_management.js)
    function openAddTypeModal() {
        if (!addTypeModal || !newApplicantTypeNameInput || !modalErrorMessages || !saveNewTypeBtn || !cancelNewTypeBtn) {
            console.error("Cannot open modal: One or more modal elements are missing.");
            alert("无法打开添加窗口：页面元素不完整。");
            return;
        }
        console.log("Opening Add Type Modal...");
        newApplicantTypeNameInput.value = '';
        modalErrorMessages.textContent = '';
        modalErrorMessages.style.display = 'none';
        newApplicantTypeNameInput.classList.remove('error');
        saveNewTypeBtn.disabled = false;
        cancelNewTypeBtn.disabled = false;
        addTypeModal.style.display = 'flex';
        newApplicantTypeNameInput.focus();
    }

    function closeAddTypeModal() {
         if (addTypeModal) {
            console.log("Closing Add Type Modal...");
            addTypeModal.style.display = 'none';
         }
    }

    async function handleSaveNewType() {
         if (!newApplicantTypeNameInput || !modalLoadingIndicator || !saveNewTypeBtn || !cancelNewTypeBtn) {
             console.error("Cannot save new type: Modal elements missing.");
             return;
         }
        const newTypeName = newApplicantTypeNameInput.value.trim();

        modalErrorMessages.style.display = 'none';
        newApplicantTypeNameInput.classList.remove('error');

        if (!newTypeName) {
            showModalError('新种类名称不能为空。');
            newApplicantTypeNameInput.classList.add('error');
            newApplicantTypeNameInput.focus();
            return;
        }

        // Check for duplicates client-side before sending to API
        let isDuplicate = false;
        for (let i = 1; i < designationSelect.options.length; i++) { // Start from 1 to skip placeholder
            if (designationSelect.options[i].text.trim().toLowerCase() === newTypeName.toLowerCase()) {
                isDuplicate = true;
                break;
            }
        }
        if (isDuplicate) {
            showModalError(`种类 "${newTypeName}" 已存在。`);
            newApplicantTypeNameInput.classList.add('error');
            newApplicantTypeNameInput.focus();
            return;
        }


        const data = {
            action: 'add_applicant_type', // Action for your API
            // Ensure the key matches what your API expects (e.g., 'designation_of_applicant' or 'name')
            designation_of_applicant: newTypeName
        };

        console.log('Submitting new applicant type:', JSON.stringify(data));
        showLoading(modalLoadingIndicator);
        saveNewTypeBtn.disabled = true;
        cancelNewTypeBtn.disabled = true;

        try {
            // Ensure the API endpoint targets the correct table for adding types
            const response = await fetch(`${API_BASE_URL}?table=applicants_types`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const parsedData = await handleApiResponse(response); // Use refined handler

            // Adjust success check based on your API response structure
            if (parsedData.status === 'success' && (parsedData.newTypeId || parsedData.insert_id || parsedData.ID)) {
                 const newId = parsedData.newTypeId || parsedData.insert_id || parsedData.ID; // Get the new ID
                alert('新种类添加成功！');
                closeAddTypeModal();
                await fetchApplicantType(); // Refresh the dropdown

                // Try to select the newly added item
                if (newId) {
                     setTimeout(() => {
                         designationSelect.value = newId.toString();
                         console.log(`Selected new type ID: ${newId}`);
                     }, 100);
                }
            } else {
                 throw new Error(parsedData.message || parsedData.error || '添加种类失败，未知错误');
            }
        } catch (error) {
            console.error('Error saving new applicant type:', error);
            showModalError(`保存失败: ${error.message}`);
        } finally {
            hideLoading(modalLoadingIndicator);
            // Ensure buttons are re-enabled even if modal elements were initially missing but now exist
            if (saveNewTypeBtn) saveNewTypeBtn.disabled = false;
            if (cancelNewTypeBtn) cancelNewTypeBtn.disabled = false;
        }
    }


    // --- Expiry Date Handling (from member_management.js) ---

    /**
     * Handles changes in the expiry date duration selection.
     * Also considers the existing date in the input field.
     */
    function handleExpiryOptionChange() {
        const selectedOption = expiredDateOptions.value;
        const currentDateInInput = expiredDateInput.value ? new Date(expiredDateInput.value + 'T00:00:00Z') : null; // Use UTC date from input if exists
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0); // Use UTC today

        // Set min date for the date picker to today
        expiredDateInput.min = today.toISOString().split('T')[0];

        let targetDate = currentDateInInput || today; // Base calculation on existing date or today

        if (selectedOption === 'custom') {
            expiredDateInput.style.display = 'block';
            // Don't clear the value if 'custom' is selected, let user edit it
            // expiredDateInput.value = ''; // Removed this line
        } else if (selectedOption === '') {
            // If "Please select" is chosen, keep the current date visible but don't calculate
            expiredDateInput.style.display = 'block';
        } else {
            // Calculate new date based on the selected duration FROM the targetDate
            let expiryDate = new Date(targetDate); // Start from existing date or today
            if (selectedOption === '1year') expiryDate.setUTCFullYear(targetDate.getUTCFullYear() + 1);
            else if (selectedOption === '2year') expiryDate.setUTCFullYear(targetDate.getUTCFullYear() + 2);
            else if (selectedOption === '3years') expiryDate.setUTCFullYear(targetDate.getUTCFullYear() + 3);

            // Optional: Subtract one day for exact duration? Decide based on requirement.
            // expiryDate.setUTCDate(expiryDate.getUTCDate() - 1);

            // Ensure calculated date is not in the past
            if (expiryDate < today) {
                expiryDate = today;
            }

            expiredDateInput.value = expiryDate.toISOString().split('T')[0]; // Set YYYY-MM-DD
            expiredDateInput.style.display = 'block';
        }
    }


    // --- Core Form Logic ---

    /**
     * Populates the form with member data.
     * Adapted for the new structure.
     */
    function populateForm(memberData) {
        console.log('Populating form with data:', memberData);

        // Clear previous errors and highlights
        errorMessages.style.display = 'none';
        memberForm.querySelectorAll('.error').forEach(el => el.classList.remove('error'));

        // --- Crucial Part: Display membersID, store real ID ---
        const displayId = memberData.membersID || memberData.ID || ''; // Prefer membersID for display
        const actualId = memberData.ID || ''; // The real primary key ID

        memberIdField.value = displayId;
        memberIdField.dataset.realId = actualId; // Store real ID in data attribute
        // --- End Crucial Part ---

        // Set other form values
        const setFormValue = (elementId, value) => {
            const element = document.getElementById(elementId);
            if (!element) {
                console.warn(`Element with id '${elementId}' not found during population`);
                return;
            }
            // Normalize null/undefined/placeholder values to empty string
            if (value === null || value === undefined || value === 'For...') {
                value = '';
            }

            // Specific handling for different element types
            if (element.tagName === 'SELECT') {
                if (elementId === 'designation_of_applicant') {
                    // Value should be the ID (string)
                    const designationId = value?.toString() || '';
                    element.value = designationId;
                    // If the value wasn't found, log it but keep the placeholder selected
                    if (designationId && !element.value) {
                         console.warn(`Designation ID "${designationId}" not found in options.`);
                         element.value = ""; // Ensure placeholder is selected
                    }
                } else if (elementId === 'gender') {
                    element.value = value?.toString().toLowerCase() || '';
                } else if (elementId === 'birthday') {
                    element.value = getMonthFromBirthday(value);
                } else {
                    element.value = value?.toString() || ''; // Generic select handling
                }
            } else if (element.type === 'date') {
                 // Use formatDate for date inputs
                 element.value = formatDate(value);
            } else if (element.tagName === 'TEXTAREA' || element.type === 'text' || element.type === 'email' || element.type === 'tel' || element.type === 'number') {
                element.value = value?.toString() || '';
            } else {
                console.log(`Unhandled element type for ID '${elementId}': ${element.tagName}, type: ${element.type}`);
            }
        };

        // Field mappings (elementId -> API key(s)) - Ensure API keys are correct
        const fieldMappings = {
            // 'memberId': handled above
            'name': ['Name'],
            'cname': ['CName'],
            'designation_of_applicant': ['Designation_of_Applicant'], // Expecting ID from API
            'address': ['Address'],
            'phone': ['phone_number'],
            'email': ['email'],
            'ic': ['IC'],
            'oldic': ['oldIC'],
            'gender': ['gender'],
            'company': ['componyName'],
            'position': ['position', 'Position'], // Add fallbacks if needed
            'birthday': ['Birthday'], // Expecting month number (1-12)
            'expiredDate': ['expired_date'], // Expecting YYYY-MM-DD or similar
            'birthplace': ['place_of_birth'],
            'others': ['others'],
            'remarks': ['remarks']
        };

        Object.entries(fieldMappings).forEach(([elementId, possibleKeys]) => {
            let valueToSet = undefined;
            for (const key of possibleKeys) {
                if (memberData.hasOwnProperty(key)) {
                    valueToSet = memberData[key];
                    break;
                }
            }
             // Use the helper function to set the value
            setFormValue(elementId, valueToSet);
        });

        // After populating, ensure the expiry dropdown reflects the state
        // If a date is loaded, keep the dropdown at "Please select" initially
        expiredDateOptions.value = ""; // Reset dropdown selection
        handleExpiryOptionChange(); // Ensure date input visibility is correct based on loaded date

        console.log('Form population complete.');
    }


    /**
     * Validates the main member form fields.
     * Adapted from member_management.js
     * @returns {boolean} True if the form is valid, false otherwise.
     */
    function validateForm() {
        const requiredFields = memberForm.querySelectorAll('[required]');
        let isValid = true;
        const errors = [];

        // Reset previous errors
        memberForm.querySelectorAll('.error').forEach(field => field.classList.remove('error'));
        errorMessages.style.display = 'none';
        errorMessages.innerHTML = '';

        requiredFields.forEach(field => {
            if (!field.value || (field.tagName === 'SELECT' && field.value === "")) {
                isValid = false;
                const labelElement = field.closest('.form-group')?.querySelector('label');
                const labelText = labelElement ? labelElement.textContent.replace('*', '').trim() : field.name;
                errors.push(`${labelText} 是必填项`);
                field.classList.add('error');
            }
        });

        // Specific field validations (reuse functions if needed)
        const emailField = document.getElementById('email');
        // Add more specific validations as required (IC, phone etc.) using helper functions if available

        const expiredDateField = document.getElementById('expiredDate');
        if (expiredDateField && expiredDateField.value && !isValidDateFormat(expiredDateField.value)) {
            isValid = false; errors.push('到期日期格式无效 (应为 YYYY-MM-DD)'); expiredDateField.classList.add('error');
        }

        if (!isValid) {
            showError(errors.join('<br>')); // Display errors using the helper
        }

        return isValid;
    }


    /**
     * Handles the form submission (Update Member).
     */
    async function handleSubmit(event) {
        event.preventDefault();
        console.log('Form submission initiated...');

        if (!validateForm()) {
             console.log("Form validation failed.");
             return;
        }

        const realDbId = memberIdField.dataset.realId; // Get the REAL ID stored in the data attribute

        if (!realDbId) {
            alert('错误：无法获取有效的塾员数据库ID，无法保存。');
            console.error("Submission aborted: Missing realDbId in dataset.");
            return;
        }

        // Prevent accidental creation attempt (shouldn't happen with loadMemberData logic, but good check)
        if (memberIdField.value.startsWith('NEW-')) {
             alert('错误：此页面仅用于编辑，不能创建新塾员。');
             return;
        }


        const formData = new FormData(memberForm);
        const memberData = {};

        // Map form data to API keys, handling nulls/empties
        formData.forEach((value, key) => {
             // Use trim() for strings, handle empty strings as null for API? (Depends on API)
             const trimmedValue = (typeof value === 'string') ? value.trim() : value;
             // Send null if empty, otherwise send the value. Adjust if API expects empty strings.
             memberData[key] = (trimmedValue === '') ? null : trimmedValue;
        });

        // Ensure expired_date is correctly formatted or null
        if (memberData['expired_date'] && !isValidDateFormat(memberData['expired_date'])) {
             console.warn("Invalid date format detected again before submit, setting to null.");
             memberData['expired_date'] = null;
        } else if (!memberData['expired_date']) {
             memberData['expired_date'] = null; // Explicitly null if empty
        }

        // Add the action for the API
        memberData.action = 'update_member'; // Or whatever your API expects for updates

        console.log('Submitting update for DB ID:', realDbId);
        console.log('Payload:', JSON.stringify(memberData, null, 2));
        showLoading(loadingIndicator);

        try {
            // Use PUT method for updates, targeting the specific member ID
            const url = `${API_BASE_URL}?table=members&ID=${encodeURIComponent(realDbId)}`;
            const response = await fetch(url, {
                method: 'PUT', // Use PUT for updating existing resource
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(memberData) // Send the mapped data
            });

            const responseData = await handleApiResponse(response); // Use refined handler
            console.log('API update response:', responseData);

            if (responseData.status === 'success' || response.ok) { // Check status or response.ok
                alert('塾员信息更新成功！');
                // Optionally redirect or just stay on the page
                // window.location.href = 'member_search.html'; // Example redirect
                 window.history.back(); // Go back to previous page (likely search results)
            } else {
                // Error message should be parsed by handleApiResponse
                throw new Error(responseData.message || '保存失败，请重试。');
            }
        } catch (error) {
            console.error('Error during submission:', error);
            // Show error on the main form
            showError(`更新失败: ${error.message}`);
        } finally {
            hideLoading(loadingIndicator);
        }
    }


    /**
     * Loads existing member data based on ID from URL.
     * Prevents loading if ID is missing or invalid.
     * Sets up the form for editing.
     */
    async function loadMemberData() {
        const urlParams = new URLSearchParams(window.location.search);
        const memberIdParam = urlParams.get('id'); // This SHOULD be the real DB ID

        // Update Title/Header dynamically
        const pageTitle = document.querySelector('title');
        const headerTitle = document.querySelector('.container h1');

        // Block 'new' attempts directly
        if (urlParams.get('new') === 'true') {
            alert('错误：此页面仅用于编辑现有塾员。请从搜索页面进入。');
            window.location.href = "member_search.html"; // Redirect
            return;
        }

        if (!memberIdParam || memberIdParam === 'null' || memberIdParam.trim() === '') {
            console.error("Error: No valid member ID found in URL parameters.");
            alert("无效的塾员ID。无法加载数据。将返回搜索页面。");
            window.location.href = "member_search.html";
            return;
        }

        const realDbId = memberIdParam; // The ID from URL is the one we fetch
        console.log(`Attempting to load data for database ID: ${realDbId}`);

        // Update titles while loading
        if (pageTitle) pageTitle.textContent = `编辑塾员信息 - 加载中...`;
        if (headerTitle) headerTitle.textContent = `编辑塾员信息 - 加载中...`;
        showLoading(loadingIndicator); // Show loading indicator

        try {
            // Fetch using the real database ID
            const url = `${makeApiUrl('members')}&search=true&ID=${encodeURIComponent(realDbId)}`;
            console.log(`Fetching member data from: ${url}`);
            const response = await fetch(url);
            const responseData = await handleApiResponse(response); // Use refined handler

            if (!responseData.data || !Array.isArray(responseData.data) || responseData.data.length === 0) {
                throw new Error(`未找到ID为 ${realDbId} 的塾员数据。`);
            }

            const memberData = responseData.data[0];

            // Populate the form (which now handles memberId display/storage)
            populateForm(memberData);

            // Update titles with loaded data
             const displayId = memberIdField.value || realDbId; // Get the displayed ID
             if (pageTitle) pageTitle.textContent = `编辑塾员信息 (${displayId})`;
             if (headerTitle) headerTitle.textContent = `编辑塾员信息 (${displayId})`;


        } catch (error) {
            console.error('Error loading member data:', error);
            showError(`加载塾员数据时出错: ${error.message}`);
            if (pageTitle) pageTitle.textContent = `编辑塾员信息 - 加载错误`;
            if (headerTitle) headerTitle.textContent = `编辑塾员信息 - 加载错误`;
            // Optionally disable form fields on load error
             Array.from(memberForm.elements).forEach(el => el.disabled = true);
        } finally {
             hideLoading(loadingIndicator); // Hide loading indicator regardless of outcome
        }
    }

    /**
     * Handles printing the current form data.
     * Uses the hidden template.
     */
    function printData() {
         const printTemplateElement = document.getElementById('print-template');
         if (!printTemplateElement) {
             alert("打印模板未找到！");
             return;
         }

         // Get current values directly from the form elements
         const memberId = document.getElementById('memberId')?.value || '';
         const name = document.getElementById('name')?.value || '';
         const cname = document.getElementById('cname')?.value || '';
         const designationText = designationSelect.selectedOptions.length > 0 ? designationSelect.selectedOptions[0].text : '';
         const address = document.getElementById('address')?.value || '';
         const phone = document.getElementById('phone')?.value || '';
         const email = document.getElementById('email')?.value || '';
         const ic = document.getElementById('ic')?.value || '';
         const oldic = document.getElementById('oldic')?.value || '';
         const genderSelect = document.getElementById('gender');
         const genderText = genderSelect.selectedOptions.length > 0 ? genderSelect.selectedOptions[0].text : '';
         const company = document.getElementById('company')?.value || '';
         const position = document.getElementById('position')?.value || '';
         const birthdaySelect = document.getElementById('birthday');
         const birthdayMonthText = birthdaySelect.selectedOptions.length > 0 ? birthdaySelect.selectedOptions[0].text : '';
         const expired = document.getElementById('expiredDate')?.value || ''; // Get from date input
         const birthplace = document.getElementById('birthplace')?.value || '';
         const others = document.getElementById('others')?.value || '';
         const remarks = document.getElementById('remarks')?.value || '';

         let printContent = printTemplateElement.innerHTML;

         // Replace placeholders
         const replacements = {
             '{{memberId}}': memberId,
             '{{name}}': name,
             '{{cname}}': cname,
             '{{designation}}': designationText,
             '{{address}}': address.replace(/\n/g, '<br>'),
             '{{phone}}': phone,
             '{{email}}': email,
             '{{ic}}': ic,
             '{{oldIc}}': oldic,
             '{{gender}}': genderText,
             '{{companyName}}': company,
             '{{position}}': position,
             '{{birthday}}': birthdayMonthText,
             '{{expiredDate}}': expired,
             '{{birthplace}}': birthplace,
             '{{others}}': others,
             '{{remarks}}': remarks.replace(/\n/g, '<br>')
         };

         for (const placeholder in replacements) {
             printContent = printContent.replace(new RegExp(placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), replacements[placeholder]);
         }

         // Open print window (same as before)
         const printWindow = window.open('', '_blank', 'width=800,height=600');
         if (printWindow) {
             printWindow.document.write(`
                 <!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8">
                 <title>打印塾员信息 - ${cname || name}</title>
                 <style>
                     body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; padding: 25px; }
                     .print-item { margin-bottom: 12px; border-bottom: 1px dotted #ccc; padding-bottom: 8px; }
                     .print-item strong { display: inline-block; width: 130px; color: #333; vertical-align: top; }
                     h1 { text-align: center; color: #800000; border-bottom: 2px solid #800000; padding-bottom: 10px; margin-bottom: 25px;}
                     @media print {
                         body { padding: 5mm; } /* Adjust margins for printing */
                         .no-print { display: none; }
                         h1 { margin-top: 0; }
                         .print-item { border-bottom: 1px solid #eee; }
                     }
                 </style>
                 </head><body>
                 <h1>塾员信息</h1>
                 ${printContent}
                 <hr class="no-print" style="margin-top: 30px;">
                 <div class="no-print" style="text-align:center; margin-top: 20px;">
                     <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; margin-right: 10px;">打印</button>
                     <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">关闭</button>
                 </div>
                 </body></html>`);
             printWindow.document.close();
         } else {
             alert("无法打开打印窗口。请检查浏览器弹出窗口设置。");
         }
    }

    /**
     * Navigates back in history.
     */
    function goBack() {
        window.history.back();
    }
    // Make goBack globally accessible if called directly from HTML onclick
    window.goBack = goBack;


    // --- Initialization Sequence ---
    try {
        // 1. Fetch Applicant Types FIRST (needed for population)
        await fetchApplicantType();
        console.log('Applicant types loading completed.');

        // 2. Load Member Data (will populate the form including designation)
        await loadMemberData();
        console.log('Member data loading completed.');

        // 3. Attach Event Listeners
        if (memberForm) {
            memberForm.addEventListener('submit', handleSubmit);
            console.log('Form submit handler attached.');
        }

        // Modal Listeners
        if (addApplicantTypeBtn) addApplicantTypeBtn.addEventListener('click', openAddTypeModal);
        if (cancelNewTypeBtn) cancelNewTypeBtn.addEventListener('click', closeAddTypeModal);
        if (saveNewTypeBtn) saveNewTypeBtn.addEventListener('click', handleSaveNewType);
        if (addTypeModal) {
            addTypeModal.addEventListener('click', (event) => {
                if (event.target === addTypeModal) closeAddTypeModal();
            });
        }
        console.log('Modal listeners attached.');

        // Expiry Dropdown Listener
        if (expiredDateOptions) {
            expiredDateOptions.addEventListener('change', handleExpiryOptionChange);
            // Initial call to set state based on loaded data
            // handleExpiryOptionChange(); // This is now called within populateForm/loadMemberData
            console.log('Expiry dropdown listener attached.');
        }

         // Print Button Listener
         if (printButton) {
             printButton.addEventListener('click', (event) => {
                 event.preventDefault(); // Prevent form submission
                 printData();
             });
             console.log('Print button handler attached.');
         } else {
             console.log('Print button (id="printButton") not found.');
         }


        console.log('Page initialization complete.');

    } catch (error) {
        console.error('Error during page initialization:', error);
        showError(`页面初始化时发生严重错误: ${error.message}<br>请尝试刷新页面。`);
        // Disable form interactions on critical init error
        Array.from(memberForm.elements).forEach(el => el.disabled = true);
    }
});

// --- Global Error Handlers (Optional but Recommended) ---
window.addEventListener('unhandledrejection', event => {
    console.error('Unhandled Promise Rejection:', event.reason);
    // Maybe show a non-intrusive notification instead of an alert
});

window.onerror = function(message, source, lineno, colno, error) {
    console.error('Global Error:', { message, source, lineno, colno, error });
    // return true; // Prevents default browser error reporting
    return false;
};

console.log("edit_member.js loaded and executing.");