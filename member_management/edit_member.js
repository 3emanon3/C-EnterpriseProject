// Use the hardcoded URL from your provided JS file
const API_BASE_URL = 'http://localhost/projects/C-EnterpriseProject/recervingAPI.php';
// Use a non-numeric value for custom to avoid conflicts with potential numeric IDs from DB
const CUSTOM_DESIGNATION_VALUE = 'custom';

// Month names mapping (kept for potential use, though not directly used in current logic)
const MONTH_NAMES = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
];

// Utility Functions
const makeApiUrl = (table) => `${API_BASE_URL}?table=${encodeURIComponent(table)}`;

const handleApiResponse = async (response) => {
    const responseText = await response.text();
    console.log('API Response Status:', response.status);
    // console.log('API Response Headers:', Object.fromEntries(response.headers.entries())); // Optional: Less verbose logging
    console.log('API Response Body Snippet:', responseText.substring(0, 500) + (responseText.length > 500 ? '...' : '')); // Log only a snippet

    if (!response.ok) {
        console.error('API Error Response:', {
            status: response.status,
            statusText: response.statusText,
            body: responseText
        });
        throw new Error(`HTTP error! status: ${response.status}\nResponse: ${responseText}`);
    }

    try {
        return JSON.parse(responseText);
    } catch (error) {
        console.error('Failed to parse response:', responseText);
        throw new Error('Invalid JSON response from server');
    }
};

function formatDate(dateString) {
    if (!dateString) return '';
    try {
        // Attempt to handle various date inputs (string, timestamp)
        const date = new Date(dateString);
        // Check if the date is valid
        if (isNaN(date.getTime())) {
             // If invalid, try parsing specifically as YYYY-MM-DD if it looks like it
             if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
                 const parts = dateString.split('-');
                 // Month is 0-indexed in JS Date
                 const validDate = new Date(parts[0], parts[1] - 1, parts[2]);
                 if (!isNaN(validDate.getTime())) {
                     return dateString; // Return original if it was already correct format
                 }
             }
            console.warn(`Invalid dateString received: ${dateString}`);
            return ''; // Return empty for invalid dates
        }
        return date.getFullYear() + '-' +
               String(date.getMonth() + 1).padStart(2, '0') + '-' +
               String(date.getDate()).padStart(2, '0');
    } catch (e) {
        console.error(`Error formatting date: ${dateString}`, e);
        return '';
    }
}


function isValidDateFormat(dateString) {
    // Allows empty string or valid YYYY-MM-DD
    return dateString === '' || /^\d{4}-\d{2}-\d{2}$/.test(dateString);
}

// Enhanced DesignationHandler Class (Handles dynamic loading)
class DesignationHandler {
    constructor() {
        this.selectElement = document.getElementById('designation_of_applicant');
        this.types = new Map(); // Map to store ID -> Name mapping
        this.createCustomDesignationUI(); // Keep UI for adding custom types
        this.setupEventListeners();
    }

    createCustomDesignationUI() {
        // Only create if it doesn't exist
        if (!document.getElementById('customDesignationContainer')) {
            const container = document.createElement('div');
            container.id = 'customDesignationContainer';
            container.className = 'custom-designation form-group'; // Added form-group for spacing
            container.style.display = 'none'; // Hidden by default
            container.style.marginTop = '10px'; // Add some space

            const input = document.createElement('input');
            input.id = 'customDesignationInput';
            input.type = 'text';
            input.placeholder = '输入新的种类名称';
            input.className = 'form-control'; // Style like other inputs

            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = '添加';
            button.className = 'btn btn-secondary btn-small'; // Style button
            button.style.marginLeft = '10px';
            button.onclick = () => this.applyCustomDesignation();

            container.appendChild(input);
            container.appendChild(button);

            // Insert after the select element's parent div
             if (this.selectElement && this.selectElement.parentNode) {
                this.selectElement.parentNode.insertAdjacentElement('afterend', container);
             } else {
                 console.error("Could not find parent node for designation select element to insert custom UI.");
             }
            this.customContainer = container;
        } else {
             this.customContainer = document.getElementById('customDesignationContainer');
        }
    }


    setupEventListeners() {
        this.selectElement.addEventListener('change', () => this.handleDesignationChange());
    }

    handleDesignationChange() {
        const isCustom = this.selectElement.value === CUSTOM_DESIGNATION_VALUE;
        if (this.customContainer) {
             this.customContainer.style.display = isCustom ? 'flex' : 'none';
        } else {
             console.warn("Custom container not found in handleDesignationChange");
        }


        if (isCustom) {
            this.selectElement.blur(); // Remove focus from select
            setTimeout(() => {
                const customInput = document.getElementById('customDesignationInput');
                if (customInput) customInput.focus();
            }, 100); // Short delay to ensure visibility
        }
    }

    async loadDesignations() {
        try {
            console.log('Fetching designations from API...');
            // Fetch ALL designations from the applicants_types table
            const response = await fetch(makeApiUrl('applicants_types') + '&limit=200'); // Fetch a reasonable limit
            const data = await handleApiResponse(response);

            if (!data.data || !Array.isArray(data.data)) {
                throw new Error('Invalid designation data format received from API');
            }

            this.clearDesignationOptions();
            this.types.clear(); // Clear the internal map too

            // Add a default placeholder option
            this.addDesignationOption('请选择', '');

            // Add dynamic designations from API response
            data.data.forEach(designation => {
                // *** IMPORTANT: Adjust key names based on your actual API response ***
                const id = designation?.ID?.toString(); // Assuming the key is 'ID'
                const name = designation?.['designation_of_applicant']; // Assuming the key is 'designation of applicant'

                if (id && name) {
                    this.addDesignationOption(name, id);
                    this.types.set(id, name); // Store mapping
                } else {
                    console.warn("Skipping designation item due to missing ID or Name:", designation);
                }
            });

            // Add the "Custom..." option *after* loading dynamic ones
            this.addDesignationOption('自定义...', CUSTOM_DESIGNATION_VALUE);

            console.log('Designations loaded successfully from API:', this.types);

        } catch (error) {
            console.error('Error loading designations from API:', error);
            // Optionally, display an error to the user
            alert(`无法加载种类选项: ${error.message}`);
            // Add placeholder and custom option even on error?
            this.clearDesignationOptions();
            this.addDesignationOption('加载错误', '');
            this.addDesignationOption('自定义...', CUSTOM_DESIGNATION_VALUE);
        }
    }

    clearDesignationOptions() {
        // Clear existing options safely
        while (this.selectElement.options.length > 0) {
            this.selectElement.remove(0);
        }
    }

    addDesignationOption(text, value) {
        const option = new Option(text, value); // Use Option constructor
        this.selectElement.add(option);
    }

    async applyCustomDesignation() {
        const input = document.getElementById('customDesignationInput');
        if (!input) return; // Guard clause
        const customValue = input.value.trim();

        if (!customValue) {
            alert('请输入有效的种类名称');
            return;
        }

        try {
            // Check if the name already exists (case-insensitive)
            const existingId = this.findExistingDesignation(customValue);
            if (existingId) {
                alert(`种类 "${customValue}" 已存在。`);
                this.selectElement.value = existingId; // Select the existing one
                if (this.customContainer) this.customContainer.style.display = 'none';
                input.value = ''; // Clear input
                return;
            }

            // Save the new designation via API
            console.log(`Attempting to save new designation: ${customValue}`);
            const newId = await this.saveNewDesignation(customValue);

            if (newId) {
                const newIdStr = newId.toString();
                console.log(`New designation saved with ID: ${newIdStr}`);
                // Add the new option just before the "Custom..." option
                const customOptionIndex = Array.from(this.selectElement.options).findIndex(opt => opt.value === CUSTOM_DESIGNATION_VALUE);
                const newOption = new Option(customValue, newIdStr);

                if (customOptionIndex !== -1) {
                    this.selectElement.add(newOption, customOptionIndex);
                } else {
                    this.selectElement.add(newOption); // Add at the end if "Custom..." isn't found
                }

                this.types.set(newIdStr, customValue); // Update internal map
                this.selectElement.value = newIdStr; // Select the newly added option
                if (this.customContainer) this.customContainer.style.display = 'none'; // Hide custom input
                input.value = ''; // Clear input
            } else {
                 throw new Error("API did not return a valid ID for the new designation.");
            }

        } catch (error) {
            console.error('Error applying custom designation:', error);
            alert(`添加自定义种类时出错: ${error.message}`);
        }
    }

    // Finds existing designation by NAME (case-insensitive)
    findExistingDesignation(value) {
        if (!value) return null;
        const lowercaseValue = value.toLowerCase();
        for (const [id, name] of this.types.entries()) {
            if (name && name.toLowerCase() === lowercaseValue) {
                return id; // Return the ID
            }
        }
        return null;
    }

    async saveNewDesignation(designationName) {
        console.log(`Sending POST to add designation: ${designationName}`);
        // *** IMPORTANT: Ensure the key matches what your API expects for creating a new type ***
        const payload = {
            'designation of applicant': designationName
            // Or maybe: 'designation_name': designationName
        };

        const response = await fetch(makeApiUrl('applicants_types'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await handleApiResponse(response);
        // *** IMPORTANT: Adjust how you get the ID based on your API's response structure ***
        // Assuming the API returns the new object with an 'ID' field in result.data
        if (result.data && result.data.ID) {
             return result.data.ID;
        } else if (result.insert_id) { // Handle if API returns insert_id directly
             return result.insert_id;
        } else {
            console.error("Could not extract new ID from save designation response:", result);
            return null;
        }
    }

    getCurrentDesignation() {
        const value = this.selectElement.value;
        // Return null if "Please select" or "Custom..." is selected
        if (!value || value === CUSTOM_DESIGNATION_VALUE) {
            return null;
        }
        // Get name from our map, fallback to selected option text if needed
        const name = this.types.get(value) || this.selectElement.options[this.selectElement.selectedIndex]?.text || '';
        return {
            id: value,
            name: name
        };
    }
}

// --- Form Management Functions ---

function setExpirationPeriod(years) {
    const currentDate = new Date();
    const expirationDate = new Date(currentDate);
    expirationDate.setFullYear(currentDate.getFullYear() + years);
    // Use the corrected formatDate function
    document.getElementById('expired').value = formatDate(expirationDate);
}

function setCustomExpirationPeriod() {
    const yearsInput = document.getElementById('customYears');
    const years = parseInt(yearsInput.value, 10);

    if (isNaN(years) || years < 1 || years > 20) { // Max 20 years seems reasonable
        alert('请输入1至20之间的有效年数');
        return;
    }
    setExpirationPeriod(years);
}

// MODIFIED: Helper function to get month number string from birthday data (expects 1-12 number/string)
function getMonthFromBirthday(birthdayData) {
    if (birthdayData === null || birthdayData === undefined || birthdayData === '') {
        return ''; // Return empty string for null/undefined/empty input
    }

    let monthNum;

    // Check if it's a number or a string representation of a number
    if (typeof birthdayData === 'number') {
        monthNum = birthdayData;
    } else if (typeof birthdayData === 'string' && /^\d+$/.test(birthdayData)) {
        monthNum = parseInt(birthdayData, 10);
    } else {
        console.warn("Invalid birthdayData format received (expected 1-12):", birthdayData);
        return ''; // Invalid format
    }

    // Validate the number is between 1 and 12
    if (monthNum >= 1 && monthNum <= 12) {
        return monthNum.toString(); // Return the valid month number as a string
    } else {
        console.warn("Invalid birthday month number received (expected 1-12):", monthNum);
        return ''; // Invalid month number
    }
}


function populateForm(memberData) {
    console.log('Populating form with data:', memberData);

    const setFormValue = (elementId, value) => {
        const element = document.getElementById(elementId);
        if (!element) {
            console.warn(`Element with id '${elementId}' not found`);
            return;
        }
        if (value === null || value === undefined || value === 'For...') {
            value = '';
        }
        if (elementId === 'expired' && value) {
            value = formatDate(value);
        }

        // Skip setting the memberId field here, as it's handled in loadMemberData
        if (elementId === 'memberId') {
             console.log(`Skipping direct population of ${elementId}, handled by loadMemberData.`);
             return;
        }


        if (element.tagName === 'SELECT') {
            if (elementId === 'designation_of_applicant') {
                const designationId = value?.toString() || '';
                 if (Array.from(element.options).some(opt => opt.value === designationId)) {
                    element.value = designationId;
                 } else if (designationId) {
                     console.warn(`Designation ID "${designationId}" found in member data, but no matching option exists in the dropdown.`);
                     element.value = '';
                 } else {
                     element.value = '';
                 }
            } else if (elementId === 'gender') {
                const genderValue = value?.toString().toLowerCase() || '';
                if (Array.from(element.options).some(opt => opt.value === genderValue)) {
                    element.value = genderValue;
                } else {
                    console.warn(`Unexpected gender value: ${value}. Setting to default.`);
                    element.value = '';
                }
            } else if (elementId === 'birthday') {
                // Use the simplified getMonthFromBirthday function
                const monthValue = getMonthFromBirthday(value);
                element.value = monthValue; // Sets the select value to '1', '2', etc. or ''
            } else {
                element.value = value?.toString() || '';
            }
        } else if (element.type === 'textarea' || element.type === 'text' || element.type === 'email' || element.type === 'tel' || element.type === 'number') {
            element.value = value?.toString() || '';
        } else {
             console.log(`Unhandled element type for ID '${elementId}': ${element.type}`);
        }
    };

    // Field mappings - Prioritize membersID for the display field key lookup
    const fieldMappings = {
        'memberId': ['membersID', 'ID'], // Prioritize membersID for getting the value initially
        'name': ['Name'],
        'cname': ['CName'],
        'designation_of_applicant': ['Designation_of_Applicant'],
        'address': ['Address'],
        'phone': ['phone_number'],
        'email': ['email'],
        'ic': ['IC'],
        'oldic': ['oldIC'],
        'gender': ['gender'],
        'company': ['companyName', 'componyName'],
        'birthday': ['Birthday'], // This key from API holds the month number
        'expired': ['expired_date', 'expired date'],
        'birthplace': ['place_of_birth', 'place of birth'],
        'others': ['others'],
        'remarks': ['remarks']
    };

    Object.entries(fieldMappings).forEach(([elementId, possibleKeys]) => {
        // Special handling for memberId is now done in loadMemberData
        if (elementId === 'memberId') return;

        let valueToSet = undefined;
        for (const key of possibleKeys) {
            // Use hasOwnProperty for safer check
            if (memberData.hasOwnProperty(key)) {
                valueToSet = memberData[key];
                break;
            }
        }
        if (valueToSet === undefined) {
             console.log(`No matching key found in memberData for form field '${elementId}' (tried keys: ${possibleKeys.join(', ')})`);
              setFormValue(elementId, '');
        } else {
             setFormValue(elementId, valueToSet);
        }
    });

    console.log('Form population complete (excluding memberId field).');
}

async function handleSubmit(event) {
    event.preventDefault();
    console.log('Form submission initiated...');

    const memberIdField = document.getElementById('memberId');
    const displayedMemberId = memberIdField ? memberIdField.value : null; // The ID shown to the user (e.g., membersID or NEW-...)
    const actualDbId = memberIdField ? memberIdField.dataset.realId : null; // The real database ID stored in the data attribute

    // Use displayedMemberId for initial checks (like if it's missing or new)
    if (!displayedMemberId) {
        alert('错误：缺少塾员显示ID，无法保存。');
        return;
    }

    const expiredDateField = document.getElementById('expired');
    if (expiredDateField && expiredDateField.value && !isValidDateFormat(expiredDateField.value)) {
        alert('到期日期格式无效。请使用 YYYY-MM-DD 或留空。');
        expiredDateField.focus();
        return;
    }

    const formData = new FormData(event.target);
    const designation = window.designationHandler.getCurrentDesignation();

    // MODIFIED: Get the raw birthday month value (e.g., '1', '12', or '')
    const birthdayMonthValue = formData.get('birthday');

    const memberData = {
        Name: formData.get('name') || null,
        CName: formData.get('cname') || null,
        'Designation_of_Applicant': designation ? designation.id : null,
        Address: formData.get('address') || null,
        phone_number: formData.get('phone') || null,
        email: formData.get('email') || null,
        IC: formData.get('ic') || null,
        oldIC: formData.get('oldic') || null,
        gender: formData.get('gender') || null,
        componyName: formData.get('company') || null,
        // MODIFIED: Send the selected month number string, or null if empty
        Birthday: birthdayMonthValue || null,
        'expired_date': formData.get('expired') || null,
        'place_of_birth': formData.get('birthplace') || null,
        others: formData.get('others') || null,
        remarks: formData.get('remarks') || null,
        // Do NOT include membersID here unless your API specifically requires it for updates
        // Do NOT include ID here for POST requests
    };

    console.log('Submitting member data payload:', memberData);

    try {
        let url = '';
        let method = '';

        // Check the DISPLAYED ID to determine if it's a new member
        if (displayedMemberId.startsWith('NEW-')) {
            // Create new member: POST request
            url = makeApiUrl('members');
            method = 'POST';
             console.log(`Preparing POST request to ${url}`);
            // The backend should generate the real ID and membersID
        } else {
            // Update existing member: PUT request
            // Use the ACTUAL DB ID stored in data-real-id for the URL
            if (!actualDbId) {
                 alert('错误：无法找到用于更新的数据库ID。请刷新页面重试。');
                 console.error('Missing actualDbId for PUT request. Displayed ID:', displayedMemberId);
                 return;
            }
            url = `${makeApiUrl('members')}&ID=${encodeURIComponent(actualDbId)}`; // Use actualDbId
            method = 'PUT';
             console.log(`Preparing PUT request to ${url} using actual ID ${actualDbId}`);
            // If your API needs the ID also in the PUT body, add it:
            // memberData.ID = actualDbId;
        }


        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(memberData)
        });

        const responseData = await handleApiResponse(response);
        console.log('API submission response:', responseData);

        if (responseData.status === 'success' || response.ok) {
            alert('塾员信息保存成功！');
            goBack();
        } else {
            throw new Error(responseData.message || '保存失败，请重试。');
        }

    } catch (error) {
        console.error('Error during form submission:', error);
        alert(`保存塾员信息时出错: ${error.message}`);
    }
}

// Print function - Requires a <template id="print-template"> in the HTML
function printData() {
    const printTemplateElement = document.getElementById('print-template');
    if (!printTemplateElement) {
        alert("打印模板未找到 (print-template)。无法打印。");
        console.error("Element with ID 'print-template' not found.");
        return;
    }

    // Get current values from the form
    const memberId = document.getElementById('memberId')?.value || '';
    const name = document.getElementById('name')?.value || '';
    const cname = document.getElementById('cname')?.value || '';

    // Get designation NAME using the handler
    const designationInfo = window.designationHandler.getCurrentDesignation();
    const designationText = designationInfo ? designationInfo.name : (document.getElementById('designation_of_applicant')?.selectedOptions[0]?.text || ''); // Fallback

    const address = document.getElementById('address')?.value || '';
    const phone = document.getElementById('phone')?.value || '';
    const email = document.getElementById('email')?.value || '';
    const ic = document.getElementById('ic')?.value || '';
    const oldic = document.getElementById('oldic')?.value || '';

    // Get gender TEXT
    const genderSelect = document.getElementById('gender');
    const genderText = genderSelect ? (genderSelect.selectedOptions[0]?.text || '') : '';

    const company = document.getElementById('company')?.value || '';

    // Get birthday month TEXT
    const birthdaySelect = document.getElementById('birthday');
    const birthdayMonthText = birthdaySelect ? (birthdaySelect.selectedOptions[0]?.text || '') : '';

    const expired = document.getElementById('expired')?.value || ''; // Already formatted YYYY-MM-DD or empty
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
        '{{address}}': address.replace(/\n/g, '<br>'), // Replace newlines for HTML display
        '{{phone}}': phone,
        '{{email}}': email,
        '{{ic}}': ic,
        '{{oldIc}}': oldic,
        '{{gender}}': genderText,
        '{{companyName}}': company,
        '{{birthday}}': birthdayMonthText, // Display the month name in print
        '{{expiredDate}}': expired,
        '{{birthplace}}': birthplace,
        '{{others}}': others,
        '{{remarks}}': remarks.replace(/\n/g, '<br>') // Replace newlines
    };

    for (const placeholder in replacements) {
        // Use RegExp for global replacement
        printContent = printContent.replace(new RegExp(placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), replacements[placeholder]);
    }

    // Open a new window and write the content
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="zh">
            <head>
                <meta charset="UTF-8">
                <title>打印塾员信息 - ${cname || name}</title>
                <style>
                    body { font-family: sans-serif; line-height: 1.5; padding: 20px; }
                    .print-item { margin-bottom: 10px; }
                    .print-item strong { display: inline-block; width: 120px; }
                    @media print {
                        body { padding: 0; }
                        .no-print { display: none; } /* Add class="no-print" to elements to hide when printing */
                    }
                </style>
            </head>
            <body>
                <h1>塾员信息</h1>
                ${printContent}
                <hr class="no-print">
                <button class="no-print" onclick="window.print()">打印</button>
                <button class="no-print" onclick="window.close()">关闭</button>
            </body>
            </html>
        `);
        printWindow.document.close(); // Important for some browsers
        // printWindow.print(); // Optionally trigger print dialog automatically
    } else {
        alert("无法打开打印窗口。请检查浏览器弹出窗口设置。");
    }
}


async function loadMemberData() {
    const urlParams = new URLSearchParams(window.location.search);
    const memberIdParam = urlParams.get('id'); // This is the REAL ID from the URL
    const isNew = urlParams.get('new') === 'true';

    const memberIdField = document.getElementById('memberId');
    const pageTitle = document.querySelector('title');
    const headerTitle = document.querySelector('.container header h1');

    if (isNew) {
        // Setup form for a new member
        const tempNewId = 'NEW-' + Date.now();
        if (memberIdField) {
             memberIdField.value = tempNewId; // Display temporary ID
             // Ensure no real ID is stored for new members
             delete memberIdField.dataset.realId;
        }
        if (pageTitle) pageTitle.textContent = '塾员管理系统 - 添加新塾员';
        if (headerTitle) headerTitle.textContent = '塾员管理系统 - 添加新塾员';
        document.getElementById('memberForm')?.reset();
        if (memberIdField) { // Re-set temp ID after reset
            memberIdField.value = tempNewId;
            delete memberIdField.dataset.realId;
        }
        console.log('Set up form for new member.');
        return;
    }

    // --- Logic for loading EXISTING member ---
    if (!memberIdParam || memberIdParam === 'null' || memberIdParam.trim() === '') {
        console.error("Error: No valid member ID found in URL parameters.");
        alert("无效的塾员ID。无法加载数据。将返回搜索页面。");
        window.location.href = "member_search.html";
        return;
    }

    // The memberIdParam from the URL is the REAL ID for fetching
    const realDbId = memberIdParam;
    console.log(`Loading data for database ID: ${realDbId}`);

    try {
        // Fetch using the real database ID
        const url = `${makeApiUrl('members')}&search=true&ID=${encodeURIComponent(realDbId)}`;
        console.log(`Fetching member data from: ${url}`);
        const response = await fetch(url);
        const responseData = await handleApiResponse(response);

        if (!responseData.data || !Array.isArray(responseData.data) || responseData.data.length === 0) {
            console.error("No member data found for ID:", realDbId);
            alert(`未找到ID为 ${realDbId} 的塾员数据。可能是该塾员已被删除。`);
            Array.from(document.querySelectorAll('#memberForm input, #memberForm select, #memberForm textarea, #memberForm button'))
                  .forEach(el => el.disabled = true);
            return;
        }

        const memberData = responseData.data[0];

        // --- Crucial Part: Display membersID, store real ID ---
        const displayId = memberData.membersID || memberData.ID || realDbId; // Fallback logic
        const actualId = memberData.ID || realDbId; // The real ID to use for updates

        if (memberIdField) {
            memberIdField.value = displayId;         // Set display value to membersID
            memberIdField.dataset.realId = actualId; // Store real ID in data attribute
        }
        if (pageTitle) pageTitle.textContent = `塾员管理系统 - 编辑塾员 (${displayId})`;
        if (headerTitle) headerTitle.textContent = `塾员管理系统 - 编辑塾员 (${displayId})`;
        // --- End Crucial Part ---

        // Populate the rest of the form
        populateForm(memberData); // Pass the full data object

    } catch (error) {
        console.error('Error loading member data:', error);
        alert(`加载塾员数据时出错: ${error.message}`);
        Array.from(document.querySelectorAll('#memberForm input, #memberForm select, #memberForm textarea, #memberForm button'))
             .forEach(el => el.disabled = true);
    }
}

function goBack() {
    // Consider if there are unsaved changes? For simplicity, just go back.
    // A more complex implementation could check form state.
    window.history.back();
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM fully loaded. Initializing edit_member page...');

    try {
        // 1. Initialize Designation Handler (makes methods available)
        window.designationHandler = new DesignationHandler();
        console.log('DesignationHandler initialized.');

        // 2. Load Designation Options (Crucial: await this before loading member data)
        await window.designationHandler.loadDesignations();
        console.log('Designation options loading completed.'); // Changed log message

        // 3. Load Member Data (which will call populateForm)
        // This now runs *after* loadDesignations has finished.
        await loadMemberData();
        console.log('Member data loading completed.'); // Changed log message

        // 4. Set up form submission handler
        const form = document.getElementById('memberForm');
        if (form) {
            form.addEventListener('submit', handleSubmit);
            console.log('Form submit handler attached.');
        } else {
            console.error('Form element with ID "memberForm" not found!');
        }

        // 5. Set up expiration period buttons
        const expirationButtons = document.querySelectorAll('[data-expiration-years]');
        expirationButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                 // Prevent potential form submission if button is accidentally inside form
                 event.preventDefault();
                const years = parseInt(button.dataset.expirationYears, 10);
                if (!isNaN(years)) {
                    setExpirationPeriod(years);
                }
            });
        });
        console.log(`Expiration period button handlers attached (${expirationButtons.length}).`);


        // 6. Set up custom expiration input handler
        const customYearsButton = document.getElementById('setCustomYears');
        if (customYearsButton) {
            customYearsButton.addEventListener('click', (event) => {
                 event.preventDefault(); // Prevent potential form submission
                 setCustomExpirationPeriod();
            });
             console.log('Custom expiration handler attached.');
        }

         // 7. Add listener for the Print button (if you add one)
         // Ensure you have <button type="button" id="printButton" class="btn btn-info">打印</button> in your HTML
         const printButton = document.getElementById('printButton');
         if (printButton) {
             printButton.addEventListener('click', (event) => {
                 event.preventDefault(); // Prevent form submission
                 printData();
             });
             console.log('Print button handler attached.');
         } else {
             console.log('Print button (id="printButton") not found. Skipping handler attachment.');
         }


        console.log('Page initialization complete.');

    } catch (error) {
        console.error('Error during page initialization:', error);
        alert(`页面初始化时发生严重错误: ${error.message}\n请尝试刷新页面。`);
        // Disable form interactions on critical init error
        Array.from(document.querySelectorAll('#memberForm input, #memberForm select, #memberForm textarea, #memberForm button'))
            .forEach(el => el.disabled = true);
    }
});

// --- Global Error Handlers ---
window.addEventListener('unhandledrejection', event => {
    console.error('Unhandled Promise Rejection:', event.reason);
    // Avoid alerting for every minor rejection, maybe log differently?
    // alert('发生了一个意外的异步错误。请检查控制台获取详细信息。');
});

window.onerror = function(message, source, lineno, colno, error) {
    console.error('Global Error:', {
        message,
        source,
        lineno,
        colno,
        error
    });
    // Prevent browser's default error handling (optional)
    // return true;
    // Consider sending critical errors to a logging service
    return false; // Let default handling occur
};

console.log("edit_member.js loaded.");