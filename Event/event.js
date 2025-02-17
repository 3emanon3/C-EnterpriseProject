const API_BASE_URL = 'http://localhost/projects/Enterprise/C-EnterpriseProject/recervingAPI.php';

class EventManager {
    constructor() {
        this.eventId = new URLSearchParams(window.location.search).get('id');
        this.form = document.getElementById('eventForm');
        this.errorMessages = document.getElementById('errorMessages');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.printButton = document.getElementById('printButton');
        this.deleteButton = document.getElementById('deleteButton');

        this.initializeEventListeners();
        if (this.eventId) {
            this.loadEventDetails();
        }
    }

    initializeEventListeners() {
        // Form submission
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEvent();
        });

        // Print button
        this.printButton.addEventListener('click', () => {
            window.print();
        });

        // Delete button
        this.deleteButton.addEventListener('click', () => {
            this.deleteEvent();
        });

        // Set minimum date for event date input
        const dateInput = document.getElementById('eventDate');
        const today = new Date();
        today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
        dateInput.min = today.toISOString().slice(0, 16);
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
            const response = await fetch(`${API_BASE_URL}?action=getEvent&id=${this.eventId}`);
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
        document.getElementById('eventId').value = event.id;
        document.getElementById('eventName').value = event.name;
        document.getElementById('eventDate').value = event.date.replace(' ', 'T');
        document.getElementById('eventVenue').value = event.venue;
        document.getElementById('eventStatus').value = event.status;
        document.getElementById('eventCapacity').value = event.capacity;
        document.getElementById('eventOrganizer').value = event.organizer;
        document.getElementById('eventDescription').value = event.description || '';
    }

    async saveEvent() {
        this.showLoading();
        try {
            const formData = new FormData(this.form);
            const method = this.eventId ? 'PUT' : 'POST';

            const response = await fetch(`${API_BASE_URL}?action=saveEvent`, {
                method: method,
                body: formData
            });

            const data = await response.json();

            if (data.status === 'success') {
                alert('Event saved successfully!');
                window.location.href = 'searchEvent.html';
            } else {
                this.showError(data.message || 'Failed to save event.');
            }
        } catch (error) {
            console.error('Error saving event:', error);
            this.showError('Failed to connect to the server.');
        } finally {
            this.hideLoading();
        }
    }

    async deleteEvent() {
        if (!this.eventId || !confirm('Are you sure you want to delete this event?')) {
            return;
        }

        this.showLoading();
        try {
            const response = await fetch(`${API_BASE_URL}?action=deleteEvent&id=${this.eventId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.status === 'success') {
                alert('Event deleted successfully!');
                window.location.href = 'searchEvent.html';
            } else {
                this.showError(data.message || 'Failed to delete event.');
            }
        } catch (error) {
            console.error('Error deleting event:', error);
            this.showError('Failed to connect to the server.');
        } finally {
            this.hideLoading();
        }
    }

    validateForm() {
        const form = this.form;
        const eventDate = new Date(form.date.value);
        const now = new Date();

        if (eventDate < now) {
            this.showError('Event date cannot be in the past.');
            return false;
        }

        if (parseInt(form.capacity.value) <= 0) {
            this.showError('Capacity must be greater than 0.');
            return false;
        }

        return true;
    }
}

// Initialize the event manager
const eventManager = new EventManager();