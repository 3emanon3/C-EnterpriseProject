let books = JSON.parse(localStorage.getItem('books')) || [];
const bookForm = document.getElementById('bookForm');
const bookTable = document.getElementById('bookTable');
const searchInput = document.getElementById('searchInput');

// Load books when page loads
document.addEventListener('DOMContentLoaded', () => {
    renderBooks();
    updateStockSummary();
});

// Search functionality
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredBooks = books.filter(book => 
        book.title.toLowerCase().includes(searchTerm) ||
        book.author.toLowerCase().includes(searchTerm) ||
        book.isbn.toLowerCase().includes(searchTerm) ||
        book.category.toLowerCase().includes(searchTerm)
    );
    renderBooks(filteredBooks);
});

// Save or update book
bookForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const bookId = document.getElementById('bookId').value;
    const book = {
        id: bookId || Date.now().toString(),
        title: document.getElementById('title').value,
        author: document.getElementById('author').value,
        isbn: document.getElementById('isbn').value,
        quantity: parseInt(document.getElementById('quantity').value),
        category: document.getElementById('category').value,
        publisher: document.getElementById('publisher').value,
        price: parseFloat(document.getElementById('price').value),
        publicationDate: document.getElementById('publicationDate').value,
        description: document.getElementById('description').value,
        location: document.getElementById('location').value
    };

    if (bookId) {
        // Update existing book
        const index = books.findIndex(b => b.id === bookId);
        books[index] = book;
    } else {
        // Check if ISBN already exists
        if (books.some(b => b.isbn === book.isbn)) {
            alert('A book with this ISBN already exists!');
            return;
        }
        // Add new book
        books.push(book);
    }

    // Save to localStorage
    localStorage.setItem('books', JSON.stringify(books));
    
    clearForm();
    renderBooks();
    updateStockSummary();
});

// Render books table
function renderBooks(booksToRender = books) {
    const tbody = bookTable.querySelector('tbody');
    tbody.innerHTML = '';

    booksToRender.forEach(book => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${book.title}</td>
            <td>${book.author}</td>
            <td>${book.isbn}</td>
            <td class="${book.quantity < 5 ? 'low-stock' : ''}">${book.quantity}</td>
            <td>${book.category}</td>
            <td>$${book.price.toFixed(2)}</td>
            <td>${book.location}</td>
            <td class="action-buttons">
                <button class="btn btn-warning" onclick="editBook('${book.id}')">Edit</button>
                <button class="btn btn-danger" onclick="deleteBook('${book.id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (booksToRender.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center;">No books found</td>
            </tr>
        `;
    }
}

// Update stock summary
function updateStockSummary() {
    const totalBooks = books.reduce((sum, book) => sum + book.quantity, 0);
    const totalTitles = books.length;
    const lowStock = books.filter(book => book.quantity < 5).length;

    document.getElementById('totalBooks').textContent = totalBooks;
    document.getElementById('totalTitles').textContent = totalTitles;
    document.getElementById('lowStock').textContent = lowStock;
}

// Edit book
function editBook(id) {
    const book = books.find(b => b.id === id);
    if (book) {
        document.getElementById('bookId').value = book.id;
        document.getElementById('title').value = book.title;
        document.getElementById('author').value = book.author;
        document.getElementById('isbn').value = book.isbn;
        document.getElementById('quantity').value = book.quantity;
        document.getElementById('category').value = book.category;
        document.getElementById('publisher').value = book.publisher;
        document.getElementById('price').value = book.price;
        document.getElementById('publicationDate').value = book.publicationDate;
        document.getElementById('description').value = book.description;
        document.getElementById('location').value = book.location;
    }
}

// Delete book
function deleteBook(id) {
    const book = books.find(b => b.id === id);
    if (confirm(`Are you sure you want to delete "${book.title}"?`)) {
        books = books.filter(b => b.id !== id);
        localStorage.setItem('books', JSON.stringify(books));
        renderBooks();
        updateStockSummary();
    }
}

// Clear form
function clearForm() {
    document.getElementById('bookId').value = '';
    bookForm.reset();
}

// ISBN validation
document.getElementById('isbn').addEventListener('input', function(e) {
    let isbn = e.target.value.replace(/[^0-9X]/gi, '');
    if (isbn.length > 13) {
        isbn = isbn.slice(0, 13);
    }
    e.target.value = isbn;
});