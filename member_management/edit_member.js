// Constants
const API_BASE_URL = 'http://localhost/projects/Enterprise/C-EnterpriseProject/recervingAPI.php';
const CUSTOM_DESIGNATION_VALUE = '5';

// Utility Functions
const makeApiUrl = (table) => `${API_BASE_URL}?table=${encodeURIComponent(table)}`;

const handleApiResponse = async (response) => {
    if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const responseText = await response.text();
    try {
        return JSON.parse(responseText);
    } catch (error) {
        console.error('Failed to parse response:', responseText);
        throw new Error('Invalid JSON response from server');
    }
};

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.getFullYear() + '/' + 
           String(date.getMonth() + 1).padStart(2, '0') + '/' + 
           String(date.getDate()).padStart(2, '0');
}

function isValidDateFormat(dateString) {
    return /^\d{4}\/\d{2}\/\d{2}$/.test(dateString);
}

// Designation Handler Class
class DesignationHandler {
    constructor() {
        this.selectElement = document.getElementById('designation_of_applicant');
        this.customContainer = document.getElementById('customDesignationContainer');
        this.types = new Map();
        this.setupEventListeners();
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
            const response = await fetch(makeApiUrl('applicants types'));
            const data = await handleApiResponse(response);

            if (!data.data || !Array.isArray(data.data)) {
                throw new Error('Invalid designation data format');
            }

            this.clearDesignationOptions();
            this.addDesignationOption('请选择', '');

            data.data.forEach(designation => {
                this.addDesignationOption(designation.designation_name, designation.id);
                this.types.set(designation.id.toString(), designation.designation_name);
            });

            this.addDesignationOption('自定义...', CUSTOM_DESIGNATION_VALUE);

        } catch (error) {
            console.error('Error loading designations:', error);
            throw error;
        }
    }

    clearDesignationOptions() {
        while (this.selectElement.firstChild) {
            this.selectElement.removeChild(this.selectElement.firstChild);
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
            this.addDesignationOption(customValue, newId);
            this.types.set(newId.toString(), customValue);
            this.selectElement.value = newId;
            this.customContainer.style.display = 'none';

        } catch (error) {
            console.error('Error applying custom designation:', error);
            alert(`添加自定义种类时出错: ${error.message}`);
        }
    }

    findExistingDesignation(value) {
        const lowercaseValue = value.toLowerCase();
        for (const [id, name] of this.types) {
            if (name.toLowerCase() === lowercaseValue) {
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
            name: this.selectElement.options[this.selectElement.selectedIndex].text
        };
    }
}

// Form Functions
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

function populateForm(memberData) {
    console.log('Populating form with data:', memberData);
    
    const setFormValue = (elementId, value) => {
        const element = document.getElementById(elementId);
        if (element) {
            if (element.tagName === 'SELECT') {
                if (elementId === 'designation_of_applicant' && value) {
                    let designationId = !isNaN(value) ? value.toString() : window.designationHandler.findExistingDesignation(value);
                    if (designationId) {
                        element.value = designationId;
                    } else {
                        element.value = '';
                    }
                } else {
                    element.value = value || '';
                }
            } else {
                element.value = value || '';
            }
        }
    };

    const fieldMappings = {
        'memberId': 'ID',
        'name': 'Name',
        'cname': 'CName',
        'designation_of_applicant': 'Designation of Applicant',
        'address': 'Address',
        'phone': 'phone_number',
        'email': 'email',
        'ic': 'IC',
        'oldic': 'oldIC',
        'gender': 'gender',
        'company': 'componyName',
        'birthday': 'Birthday',
        'expired': 'expired date',
        'birthplace': 'place of birth',
        'remarks': 'remarks'
    };

    Object.entries(fieldMappings).forEach(([elementId, dataKey]) => {
        let value = memberData[dataKey];
        
        if (elementId === 'birthday' && value) {
            value = parseInt(value);
        }
        
        if (elementId === 'expired' && value) {
            value = formatDate(value);
        }

        setFormValue(elementId, value);
    });
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
        alert('过期日期格式必须为 YYYY/MM/DD');
        return;
    }

    const formData = new FormData(event.target);
    const memberData = Object.fromEntries(formData.entries());

    const designation = window.designationHandler.getCurrentDesignation();
    if (designation) {
        memberData['Designation of Applicant'] = designation.name;
    }

    // Format data
    if (memberData.Birthday) {
        memberData.Birthday = parseInt(memberData.Birthday);
    }

    // Clean empty values
    Object.keys(memberData).forEach(key => {
        if (memberData[key] === '') {
            memberData[key] = null;
        }
    });

    memberData.membersID = memberId;

    try {
        const url = `${API_BASE_URL}?table=members&search=true&ID=${memberData.membersID}`;
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(memberData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        alert('Member information updated successfully!');
        window.location.href = 'member_search.html';
    } catch (error) {
        console.error('Error during submission:', error);
        alert(`An error occurred while updating member information: ${error.message}`);
    }
}

async function loadMemberData() {
    const urlParams = new URLSearchParams(window.location.search);
    const memberId = urlParams.get('id');

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

        const responseData = await response.json();
        
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

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    try {
        window.designationHandler = new DesignationHandler();
        await window.designationHandler.loadDesignations();
        await loadMemberData();
    } catch (error) {
        console.error('Initialization error:', error);
    }
});