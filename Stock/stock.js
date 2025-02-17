const API_BASE_URL = 'http://localhost/projects/Enterprise/C-EnterpriseProject/stockAPI.php';

class StockManager {
    constructor() {
        this.form = document.getElementById('stockForm');
        this.errorMessages = document.getElementById('errorMessages');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.resultsContainer = document.getElementById('stockResults');
        this.resultSymbol = document.getElementById('resultSymbol');
        this.resultCompany = document.getElementById('resultCompany');
        this.resultPrice = document.getElementById('resultPrice');
        this.resultChange = document.getElementById('resultChange');
        this.resultVolume = document.getElementById('resultVolume');

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.fetchStockDetails();
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

    async fetchStockDetails() {
        this.showLoading();
        try {
            const formData = new FormData(this.form);
            const response = await fetch(`${API_BASE_URL}?action=getStock&symbol=${formData.get('symbol')}&date=${formData.get('date')}`);
            const data = await response.json();

            if (data.status === 'success') {
                this.displayStockData(data.stock);
            } else {
                this.showError('Failed to fetch stock details.');
            }
        } catch (error) {
            console.error('Error fetching stock details:', error);
            this.showError('Failed to connect to the server.');
        } finally {
            this.hideLoading();
        }
    }

    displayStockData(stock) {
        this.resultSymbol.textContent = stock.symbol;
        this.resultCompany.textContent = stock.company;
        this.resultPrice.textContent = `$${stock.price}`;
        this.resultChange.textContent = `${stock.change}%`;
        this.resultVolume.textContent = stock.volume;
        this.resultsContainer.style.display = 'block';
    }
}

// Initialize the stock manager
const stockManager = new StockManager();
