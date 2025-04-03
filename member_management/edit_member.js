const API_BASE_URL = 'http://localhost/projects/C-EnterpriseProject/recervingAPI.php';
const CUSTOM_DESIGNATION_VALUE = '8';  // Changed from '5' to '6' since 5 is now used for "逾期"

// Static designation mappings - updated to include "逾期" (Overdue)
const STATIC_DESIGNATIONS = [
    { id: '1', name: '会员', englishName: 'Member' },
    { id: '2', name: '非会员', englishName: 'Non-Member' },
    { id: '3', name: '外国人', englishName: 'Foreigner' },
    { id: '4', name: '拒绝继续', englishName: 'Reject' },
    { id: '5', name: '逾期', englishName: 'Overdue' }
];

// Month names mapping
const MONTH_NAMES = [
    '一月', '二月', '三月', '四月', '五月', '六月', 
    '七月', '八月', '九月', '十月', '十一月', '十二月'
];

// Utility Functions
const makeApiUrl = (table) => `${API_BASE_URL}?table=${encodeURIComponent(table)}`;

const handleApiResponse = async (response) => {
    const responseText = await response.text();
    console.log('API Response Status:', response.status);
    console.log('API Response Headers:', Object.fromEntries(response.headers.entries()));
    console.log('API Response Body:', responseText);

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

const designation_of_applicant=document.getElementById('designation_of_applicant')
    
  
fetchApplicantType();


async function fetchApplicantType() {
    try {
        const response = await fetch(`${API_BASE_URL}?table=applicants%20types&limit=100`);
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
                option.textContent = `${item["designation of applicant"]}`;
                designation_of_applicant.appendChild(option);
            });
        }
    } catch(error) {
        console.error("Error fetching applicant type options:", error);
    }
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.getFullYear() + '-' + 
           String(date.getMonth() + 1).padStart(2, '0') + '-' + 
           String(date.getDate()).padStart(2, '0');
}

function isValidDateFormat(dateString) {
    return /^\d{4}-\d{2}-\d{2}$/.test(dateString);
}

// Enhanced DesignationHandler Class
class DesignationHandler {
    constructor() {
        this.selectElement = document.getElementById('designation_of_applicant');
        this.types = new Map();
        this.createCustomDesignationUI();
        this.setupEventListeners();
    }

    createCustomDesignationUI() {
        if (!document.getElementById('customDesignationContainer')) {
            const container = document.createElement('div');
            container.id = 'customDesignationContainer';
            container.className = 'custom-designation';
            container.style.display = 'none';

            const input = document.createElement('input');
            input.id = 'customDesignationInput';
            input.type = 'text';
            input.placeholder = '输入新的种类名称';

            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = '添加';
            button.onclick = () => this.applyCustomDesignation();

            container.appendChild(input);
            container.appendChild(button);
            this.selectElement.parentNode.appendChild(container);
            this.customContainer = container;
        }
    }

    setupEventListeners() {
        this.selectElement.addEventListener('change', () => this.handleDesignationChange());
    }

    handleDesignationChange() {
        const isCustom = this.selectElement.value === CUSTOM_DESIGNATION_VALUE;
        this.customContainer.style.display = isCustom ? 'flex' : 'none';
        
        if (isCustom) {
            this.selectElement.blur();
            setTimeout(() => {
                document.getElementById('customDesignationInput').focus();
            }, 100);
        }
    }

    async loadDesignations() {
        try {
            console.log('Fetching designations...');
            const response = await fetch(makeApiUrl('applicants types'));
            const data = await handleApiResponse(response);

            if (!data.data || !Array.isArray(data.data)) {
                throw new Error('Invalid designation data format');
            }

            this.clearDesignationOptions();
            this.addDesignationOption('请选择', '');

            // Add static designations first
            STATIC_DESIGNATIONS.forEach(designation => {
                this.addDesignationOption(designation.name, designation.id);
                this.types.set(designation.id, designation.name);
            });

            // Add dynamic designations from API
            data.data.forEach(designation => {
                const id = designation?.id?.toString() || '';
                const name = designation?.designation_name || '';
                
                if (id && name && !this.types.has(id)) {
                    this.addDesignationOption(name, id);
                    this.types.set(id, name);
                }
            });

            this.addDesignationOption('自定义...', CUSTOM_DESIGNATION_VALUE);
            console.log('Designations loaded successfully:', this.types);

        } catch (error) {
            console.error('Error loading designations:', error);
            // Don't throw - allow initialization to continue with static designations
        }
    }

    clearDesignationOptions() {
        while (this.selectElement.firstChild) {
            this.selectElement.firstChild.remove();
        }
    }

    addDesignationOption(text, value) {
        const option = new Option(text, value);
        this.selectElement.add(option);
    }

    async applyCustomDesignation() {
        const input = document.getElementById('customDesignationInput');
        const customValue = input.value.trim();

        if (!customValue) {
            alert('请输入有效的种类名称');
            return;
        }

        try {
            const existingId = this.findExistingDesignation(customValue);
            if (existingId) {
                this.selectElement.value = existingId;
                this.customContainer.style.display = 'none';
                return;
            }

            const newId = await this.saveNewDesignation(customValue);
            if (newId) {
                this.addDesignationOption(customValue, newId);
                this.types.set(newId.toString(), customValue);
                this.selectElement.value = newId;
                this.customContainer.style.display = 'none';
            }

        } catch (error) {
            console.error('Error applying custom designation:', error);
            alert(`添加自定义种类时出错: ${error.message}`);
        }
    }

    findExistingDesignation(value) {
        if (!value) return null;
        const lowercaseValue = value.toLowerCase();
        for (const [id, name] of this.types) {
            if (name && name.toLowerCase() === lowercaseValue) {
                return id;
            }
        }
        return null;
    }

    async saveNewDesignation(designationName) {
        const response = await fetch(makeApiUrl('applicants types'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ designation_name: designationName })
        });

        const result = await handleApiResponse(response);
        return result.id || result.data?.id;
    }

    getCurrentDesignation() {
        const value = this.selectElement.value;
        if (!value || value === CUSTOM_DESIGNATION_VALUE) return null;
        return {
            id: value,
            name: this.types.get(value) || this.selectElement.options[this.selectElement.selectedIndex]?.text || ''
        };
    }
}

// Form Management Functions
function setExpirationPeriod(years) {
    const currentDate = new Date();
    const expirationDate = new Date(currentDate);
    expirationDate.setFullYear(currentDate.getFullYear() + years);
    document.getElementById('expired').value = formatDate(expirationDate);
}

function setCustomExpirationPeriod() {
    const yearsInput = document.getElementById('customYears');
    const years = parseInt(yearsInput.value);
    
    if (isNaN(years) || years < 1 || years > 20) {
        alert('请输入1至20之间的有效年数');
        return;
    }
    
    setExpirationPeriod(years);
}

// Helper function to get month from birthday data
function getMonthFromBirthday(birthdayData) {
    if (!birthdayData) return '';
    
    // Handle timestamp from API
    if (typeof birthdayData === 'number') {
        const date = new Date(birthdayData);
        if (!isNaN(date.getTime())) {
            return (date.getMonth() + 1).toString();
        }
    }
    
    // Handle string with possible month number (from API)
    if (typeof birthdayData === 'string') {
        // Try to extract month from date string like "YYYY-MM-DD" or "YYYY/MM/DD"
        const dateMatch = birthdayData.match(/\d{4}[-\/](\d{2})[-\/]\d{2}/);
        if (dateMatch && dateMatch[1]) {
            // Return month number without leading zero
            return parseInt(dateMatch[1], 10).toString();
        }
        
        // If it's already just a month number
        if (/^([1-9]|1[0-2])$/.test(birthdayData)) {
            return birthdayData;
        }
    }
    
    return '';
}

function populateForm(memberData) {
    console.log('Populating form with data:', memberData);
    
    const setFormValue = (elementId, value) => {
        const element = document.getElementById(elementId);
        if (!element) {
            console.warn(`Element with id '${elementId}' not found`);
            return;
        }

        if (value === 'For...' || value === null || value === undefined) {
            value = '';
        }

        if (element.tagName === 'SELECT') {
            if (elementId === 'designation_of_applicant') {
                let designationValue = value?.toString() || '';
                
                // Try to find matching designation from static list first
                const staticDesignation = STATIC_DESIGNATIONS.find(d => 
                    d.name === designationValue || d.englishName === designationValue || d.id === designationValue
                );
                
                if (staticDesignation) {
                    element.value = staticDesignation.id;
                } else {
                    element.value = designationValue;
                }
            } else if (elementId === 'gender') {
                const genderValue = value?.toString().toLowerCase() || '';
                if (genderValue === 'male' || genderValue === 'female') {
                    element.value = genderValue; // This should work if the <select> has the correct options
                } else {
                    console.warn(`Unexpected gender value: ${genderValue}`);
                }
            } else if (elementId === 'birthday') {
                // Handle birthday as month only
                const monthValue = getMonthFromBirthday(value);
                element.value = monthValue;
            } else {
                element.value = value || '';
            }
        } else {
            element.value = value || '';
        }
    };

    const fieldMappings = {
        'memberId': ['ID', 'membersID'],
        'name': ['Name'],
        'cname': ['CName'],
        'designation_of_applicant': ['Designation of Applicant'],
        'address': ['Address'],
        'phone': ['phone_number'],
        'email': ['email'],
        'ic': ['IC'],
        'oldic': ['oldIC'],
        'gender': ['gender'],
        'company': [ 'componyName'],
        'birthday': ['Birthday'],
        'expired': ['expired date',],
        'birthplace': ['place of birth'],
        'others':['others'],
        'remarks': ['remarks']
    };

    Object.entries(fieldMappings).forEach(([elementId, possibleKeys]) => {
        let value = null;
        
        for (const key of possibleKeys) {
            if (memberData[key] !== undefined) {
                value = memberData[key];
                break;
            }
        }
        
        setFormValue(elementId, value);
    });
    console.log('Populated others field:', document.getElementById('others').value);
    console.log('Populated expired date:', document.getElementById('expired').value);
    console.log('Populated birthplace:', document.getElementById('birthplace').value);
}

function isNewMember() {
    const memberId = document.getElementById('memberId').value;
    return !memberId || memberId.startsWith('NEW');
}

async function handleSubmit(event) {
    event.preventDefault();
    console.log('Form submission started');

    const memberId = document.getElementById('memberId').value;
    if (!memberId) {
        alert('Member ID is missing. Cannot update member information.');
        return;
    }

    const expiredDateField = document.getElementById('expired');
    if (expiredDateField.value && !isValidDateFormat(expiredDateField.value)) {
        alert('过期日期格式必须为 YYYY-MM-DD');
        return;
    }

    const formData = new FormData(event.target);

    const othersValue = document.getElementById('others').value;
    console.log('Explicitly captured others value:', othersValue);

    const designation = window.designationHandler.getCurrentDesignation();
    const birthdayMonth = formData.get('birthday');

    // Store just the month value for birthday
    // We'll use a consistent format in the database (timestamp of first day of month)
    let birthdayValue = null;
    if (birthdayMonth) {
        // Create a date object for the first day of the selected month in the current year
        const currentYear = new Date().getFullYear();
        const birthdayDate = new Date(currentYear, parseInt(birthdayMonth) - 1, 1);
        birthdayValue = birthdayDate.getTime();
    }

    const memberData = {
        ID: memberId,
        Name: formData.get('name') || null,
        CName: formData.get('cname') || null,
        'Designation of Applicant': designation?.id || null,
        Address: formData.get('address') || null,
        phone_number: formData.get('phone') || null,
        email: formData.get('email') || null,
        IC: formData.get('ic') || null,
        oldIC: formData.get('oldic') || null,
        gender: formData.get('gender') || null,
        companyName: formData.get('company') || null,
        componyName: formData.get('company') || null,
        Birthday: birthdayValue,
        'expired date': formData.get('expired') || null,
        'place of birth': formData.get('birthplace') || null,
        others: othersValue  || null,
        remarks: formData.get('remarks') || null,
        action: 'add_member'
    };

    console.log('others field value:', formData.get('others'));
    console.log('Submitting member data:', memberData);

    try {
        let url = '';
        let method = '';
        
        // Check if this is a new member or update based on ID
        if (memberId.startsWith('NEW')) {
            // Create new member
            url = `${API_BASE_URL}?table=members`;
            method = 'POST';
        } else {
            // Update existing member - first check if exists
            const checkUrl = `${API_BASE_URL}?table=members&search=true&ID=${memberId}`;
            const checkResponse = await fetch(checkUrl);
            const checkData = await handleApiResponse(checkResponse);

            if (checkData.data && checkData.data.length > 0) {
                // Update existing member
                url = `${API_BASE_URL}?table=members&ID=${memberId}`;
                method = 'PUT';
            } else {
                // Create new member if ID doesn't exist
                url = `${API_BASE_URL}?table=members`;
                method = 'POST';
            }
        }

        // Make the API request
        console.log(`Making ${method} request to ${url}`);
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(memberData)
        });

        const responseData = await handleApiResponse(response);
        console.log('API response:', responseData);
        
        if (responseData.status === 'success' || response.ok) {
            alert('Member information saved successfully!');
            window.history.back();
        } else {
            throw new Error(responseData.message || 'Operation failed');
        }
    }  catch (error) {
        console.error('Error during submission:', error);
        alert(`更新会员信息时出错: ${error.message}`);
    }
}

function printData() {
    const memberId = document.getElementById('memberId').value;
    const name = document.getElementById('name').value;
    const cname = document.getElementById('cname').value;
    const designation = document.getElementById('designation_of_applicant').options[document.getElementById('designation_of_applicant').selectedIndex].text;
    const address = document.getElementById('address').value;
    const phone = document.getElementById('phone').value;
    const email = document.getElementById('email').value;
    const ic = document.getElementById('ic').value;
    const oldic = document.getElementById('oldic').value;
    const gender = document.getElementById('gender').options[document.getElementById('gender').selectedIndex].text;
    const company = document.getElementById('company').value;
    
    // Get the month name instead of number for display
    const birthdaySelect = document.getElementById('birthday');
    const birthdayMonth = birthdaySelect.value ? 
        birthdaySelect.options[birthdaySelect.selectedIndex].text : '';
    
    const expired = document.getElementById('expired').value;
    const birthplace = document.getElementById('birthplace').value;
    const others=document.getElementById('others').value;
    const remarks = document.getElementById('remarks').value;

    // Get the print template
    let printTemplate = document.getElementById('print-template').innerHTML;
    
    // Replace placeholders with actual data
    printTemplate = printTemplate.replace('{{memberId}}', memberId)
        .replace('{{name}}', name)
        .replace('{{cname}}', cname)
        .replace('{{designation}}', designation)
        .replace('{{address}}', address)
        .replace('{{phone}}', phone)
        .replace('{{email}}', email)
        .replace('{{ic}}', ic)
        .replace('{{oldIc}}', oldic)
        .replace('{{gender}}', gender)
        .replace('{{companyName}}', company)
        .replace('{{birthday}}', birthdayMonth)
        .replace('{{expiredDate}}', expired)
        .replace('{{birthplace}}', birthplace)
        .replace('{{others}}', others)
        .replace('{{remarks}}', remarks);

    // Open a new window for printing
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printTemplate);
    printWindow.document.close();
}

async function loadMemberData() {
    const urlParams = new URLSearchParams(window.location.search);
    const memberId = urlParams.get('id');
    const isNew = urlParams.get('new') === 'true';

    if (isNew) {
        // Set up form for new member
        document.getElementById('memberId').value = 'NEW-' + Date.now();
        document.title = '添加新会员';
        const headerElement = document.querySelector('h1, h2, .header');
        if (headerElement) {
            headerElement.textContent = '添加新会员';
        }
        return;
    }

    if (!memberId || memberId === 'null' || memberId.trim() === '') {
        console.error("Error: No valid member ID in URL");
        alert("Invalid member ID. Cannot load data.");
        window.location.href = "member_search.html";
        return;
    }

    try {
        const url = `${API_BASE_URL}?table=members&search=true&ID=${memberId}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await handleApiResponse(response);
        
        if (!responseData.data || !Array.isArray(responseData.data) || responseData.data.length === 0) {
            throw new Error("No member data found");
        }
        
        populateForm(responseData.data[0]);

    } catch (error) {
        console.error('Error loading member data:', error);
        alert(`Failed to load member data: ${error.message}`);
    }
}

function goBack() {
    window.history.back();
}

function confirmCancel() {
    if (confirm('确定要取消编辑吗？未保存的更改将丢失。')) {
        goBack();
    }
}

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Page loaded, initializing...');
    
    try {
        // Initialize DesignationHandler as a global instance
        window.designationHandler = new DesignationHandler();
        await window.designationHandler.loadDesignations();
        console.log('Designations loaded successfully');

        // Load member data
        await loadMemberData();
        console.log('Member data loaded and form populated');

        // Set up form submission handler
        const form = document.getElementById('memberForm');
        if (form) {
            form.addEventListener('submit', handleSubmit);
        } else {
            console.error('Form element not found');
        }

        // Set up expiration period buttons if they exist
        const expirationButtons = document.querySelectorAll('[data-expiration-years]');
        expirationButtons.forEach(button => {
            button.addEventListener('click', () => {
                const years = parseInt(button.dataset.expirationYears);
                if (!isNaN(years)) {
                    setExpirationPeriod(years);
                }
            });
        });

        // Set up custom expiration input handler
        const customYearsButton = document.getElementById('setCustomYears');
        if (customYearsButton) {
            customYearsButton.addEventListener('click', setCustomExpirationPeriod);
        }

        console.log('All event handlers initialized');

    } catch (error) {
        console.error('Initialization error:', error);
        alert('系统初始化时出错，请刷新页面重试。');
    }
});

// Error handling for uncaught promises
window.addEventListener('unhandledrejection', event => {
    console.error('Unhandled promise rejection:', event.reason);
    alert('操作过程中出现错误，请重试。如果问题持续存在，请刷新页面。');
});

// Global error handler
window.onerror = function(message, source, lineno, colno, error) {
    console.error('Global error:', {
        message,
        source,
        lineno,
        colno,
        error
    });
    return false;
};

