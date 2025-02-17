const API_BASE_URL = 'http://localhost/projects/Enterprise/C-EnterpriseProject/recervingAPI.php';

class DonationManager {
    constructor() {
        this.donationId = new URLSearchParams(window.location.search).get('id');
        this.form = document.getElementById('donationForm');
        this.errorMessages = document.getElementById('errorMessages');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.printButton = document.getElementById('printButton');
        this.deleteButton = document.getElementById('deleteButton');

        this.initializeEventListeners();
        if (this.donationId) {
            this.loadDonationDetails();
        }
    }

    initializeEventListeners() {
        // Form submission
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveDonation();
        });

        // Print button
        this.printButton.addEventListener('click', () => {
            window.print();
        });

        // Delete button
        this.deleteButton.addEventListener('click', () => {
            this.deleteDonation();
        });

        // Set minimum date for donation date input
        const dateInput = document.getElementById('donationDate');
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

    async loadDonationDetails() {
        this.showLoading();
        try {
            const response = await fetch(`${API_BASE_URL}?action=getDonation&id=${this.donationId}`);
            const data = await response.json();

            if (data.status === 'success') {
                this.populateForm(data.donation);
            } else {
                this.showError('Failed to load donation details.');
            }
        } catch (error) {
            console.error('Error loading donation details:', error);
            this.showError('Failed to connect to the server.');
        } finally {
            this.hideLoading();
        }
    }

    populateForm(donation) {
        document.getElementById('donationId').value = donation.id;
        document.getElementById('donorName').value = donation.donor_name;
        document.getElementById('donationDate').value = donation.donation_date.replace(' ', 'T');
        document.getElementById('donationAmount').value = donation.amount;
        document.getElementById('paymentMethod').value = donation.payment_method;
        document.getElementById('donationStatus').value = donation.status;
        document.getElementById('donorEmail').value = donation.donor_email;
        document.getElementById('donationMessage').value = donation.message || '';
    }

    async saveDonation() {
        this.showLoading();
        try {
            const formData = new FormData(this.form);
            const method = this.donationId ? 'PUT' : 'POST';

            const response = await fetch(`${API_BASE_URL}?action=saveDonation`, {
                method: method,
                body: formData
            });

            const data = await response.json();

            if (data.status === 'success') {
                alert('Donation saved successfully!');
                window.location.href = 'searchDonate.html';
            } else {
                this.showError(data.message || 'Failed to save donation.');
            }
        } catch (error) {
            console.error('Error saving donation:', error);
            this.showError('Failed to connect to the server.');
        } finally {
            this.hideLoading();
        }
    }

    async deleteDonation() {
        if (!this.donationId || !confirm('Are you sure you want to delete this donation?')) {
            return;
        }

        this.showLoading();
        try {
            const response = await fetch(`${API_BASE_URL}?action=deleteDonation&id=${this.donationId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.status === 'success') {
                alert('Donation deleted successfully!');
                window.location.href = 'searchDonate.html';
            } else {
                this.showError(data.message || 'Failed to delete donation.');
            }
        } catch (error) {
            console.error('Error deleting donation:', error);
            this.showError('Failed to connect to the server.');
        } finally {
            this.hideLoading();
        }
    }

    validateForm() {
        const form = this.form;
        const donationDate = new Date(form.donation_date.value);
        const now = new Date();

        if (donationDate > now) {
            this.showError('Donation date cannot be in the future.');
            return false;
        }

        if (parseFloat(form.amount.value) <= 0) {
            this.showError('Donation amount must be greater than 0.');
            return false;
        }

        return true;
    }
}

// Initialize the donation manager
const donationManager = new DonationManager();
