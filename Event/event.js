const API_BASE_URL = 'http://localhost/projects/C-EnterpriseProject/recervingAPI.php';

class EventManager {
    constructor() {
        this.eventId = new URLSearchParams(window.location.search).get('id');
        this.form = document.getElementById('eventForm');
        this.errorMessages = document.getElementById('errorMessages');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        // Remove the delete button reference

        this.initializeEventListeners();
        if (this.eventId) {
            this.loadEventDetails();
        }
    }

    initializeEventListeners() {
        // Form submission
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (this.validateForm()) {
                this.saveEvent();
            }
        });

        // Delete button event listener has been removed

        // Set minimum date for event date inputs
        const startTimeInput = document.getElementById('eventStartTime');
        const endTimeInput = document.getElementById('eventEndTime');
        const registrationDeadlineInput = document.getElementById('eventRegistrationDeadline');
        
        const today = new Date();
        today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
        const todayStr = today.toISOString().slice(0, 16);
        
        startTimeInput.min = todayStr;
        endTimeInput.min = todayStr;
        registrationDeadlineInput.min = todayStr;
        
        // Ensure end time is after start time
        startTimeInput.addEventListener('change', () => {
            endTimeInput.min = startTimeInput.value;
            if (endTimeInput.value && endTimeInput.value < startTimeInput.value) {
                endTimeInput.value = startTimeInput.value;
            }
        });
    }

    showLoading() {
        this.loadingIndicator.style.display = 'block';
    }

    hideLoading() {
        this.loadingIndicator.style.display = 'none';
    }

    showError(message) {
        this.errorMessages.textContent = message;
        this.errorMessages.style.display = 'block';
        setTimeout(() => {
            this.errorMessages.style.display = 'none';
        }, 5000);
    }

    async loadEventDetails() {
        this.showLoading();
        try {
            const response = await fetch(`${API_BASE_URL}?table=event&ID=${this.eventId}`);
            const data = await response.json();

            if (data.status === 'success') {
                this.populateForm(data.event);
            } else {
                this.showError('Failed to load event details.');
            }
        } catch (error) {
            console.error('Error loading event details:', error);
            this.showError('Failed to connect to the server.');
        } finally {
            this.hideLoading();
        }
    }

    populateForm(event) {
        document.getElementById('eventId').value = event.ID || event.id || '';
        document.getElementById('eventTitle').value = event.title || '';
        document.getElementById('eventStatus').value = event.status || 'not started';
        document.getElementById('eventStartTime').value = this.formatDateTimeForInput(event.start_time) || '';
        document.getElementById('eventEndTime').value = this.formatDateTimeForInput(event.end_time) || '';
        document.getElementById('eventCreateTime').value = this.formatDateTimeForInput(event.created_at) || '';
        document.getElementById('eventLocation').value = event.location || '';
        document.getElementById('eventDescription').value = event.description || '';
        document.getElementById('eventMaxParticipant').value = event.max_participant || '';
        document.getElementById('eventRegistrationDeadline').value = this.formatDateTimeForInput(event.registration_deadline) || '';
        document.getElementById('eventPrice').value = event.price || '';
        document.getElementById('eventOnlineLink').value = event.online_link || '';
    }

    formatDateTimeForInput(dateTimeStr) {
        if (!dateTimeStr) return '';
        // Convert MySQL datetime format to HTML datetime-local input format
        return dateTimeStr.replace(' ', 'T');
    }

    async saveEvent() {
        this.showLoading();
        try {
            // Instead of FormData, create a JSON object
            const formData = new FormData(this.form);
            const jsonData = {};
            
            // Convert FormData to JSON object
            formData.forEach((value, key) => {
                // Ensure status is properly captured even if it's "Not Started"
                if (key === 'eventStatus' && value === "Not Started") {
                    jsonData[key] = "Not Started";
                } else {
                    jsonData[key] = value;
                }
            });
            
            // If updating an existing event, ensure the ID is included
            if (this.eventId) {
                jsonData.id = this.eventId;
            }
            
            console.log('Data being sent:', jsonData); 

            const response = await fetch(`${API_BASE_URL}?table=event`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(jsonData)
            });
    
            if (!response.ok) {
                console.error('Server response:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('Error details:', errorText);
                throw new Error(`Server returned ${response.status}`);
            }
    
            const data = await response.json();
    
            if (data.status === 'success') {
                alert('Event saved successfully!');
                window.location.href = 'searchEvent.html';
            } else {
                this.showError(data.message || 'Failed to save event.');
            }
        } catch (error) {
            console.error('Error saving event:', error);
            this.showError('Failed to connect to the server: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    // deleteEvent method has been removed

    validateForm() {
        // Get form values
        const startTime = new Date(document.getElementById('eventStartTime').value);
        const endTime = new Date(document.getElementById('eventEndTime').value);
        const registrationDeadline = new Date(document.getElementById('eventRegistrationDeadline').value);
        const maxParticipants = parseInt(document.getElementById('eventMaxParticipant').value);
        const now = new Date();

        // Validate dates
        if (startTime < now) {
            this.showError('Start time cannot be in the past.');
            return false;
        }

        if (endTime <= startTime) {
            this.showError('End time must be after start time.');
            return false;
        }

        if (registrationDeadline > startTime) {
            this.showError('Registration deadline must be before the event starts.');
            return false;
        }

        // Validate other fields
        if (maxParticipants <= 0) {
            this.showError('Maximum participants must be greater than 0.');
            return false;
        }

        return true;
    }
}

// Initialize the event manager
const eventManager = new EventManager();