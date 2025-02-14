let events = JSON.parse(localStorage.getItem('events')) || [];
const eventForm = document.getElementById('eventForm');
const eventTable = document.getElementById('eventTable');
const searchInput = document.getElementById('searchInput');

// Load events when the page loads
document.addEventListener('DOMContentLoaded', () => {
    renderEvents();
});

// Search functionality
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredEvents = events.filter(event => 
        event.name.toLowerCase().includes(searchTerm) ||
        event.date.toLowerCase().includes(searchTerm) ||
        event.location.toLowerCase().includes(searchTerm) ||
        event.type.toLowerCase().includes(searchTerm)
    );
    renderEvents(filteredEvents);
});

// Save or update event
eventForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const eventId = document.getElementById('eventId').value;
    const event = {
        id: eventId || Date.now().toString(),
        name: document.getElementById('eventName').value,
        date: document.getElementById('eventDate').value,
        location: document.getElementById('eventLocation').value,
        type: document.getElementById('eventType').value
    };

    if (eventId) {
        // Update existing event
        const index = events.findIndex(e => e.id === eventId);
        events[index] = event;
    } else {
        // Add new event
        events.push(event);
    }

    // Save to localStorage
    localStorage.setItem('events', JSON.stringify(events));
    
    clearForm();
    renderEvents();
});

// Render events table
function renderEvents(eventsToRender = events) {
    const tbody = eventTable.querySelector('tbody');
    tbody.innerHTML = '';

    eventsToRender.forEach(event => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${event.name}</td>
            <td>${formatDate(event.date)}</td>
            <td>${event.location}</td>
            <td>${event.type}</td>
            <td class="action-buttons">
                <button class="btn btn-warning" onclick="editEvent('${event.id}')">Edit</button>
                <button class="btn btn-danger" onclick="deleteEvent('${event.id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Show message if no events found
    if (eventsToRender.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center;">No events found</td>
            </tr>
        `;
    }
}

// Edit event
function editEvent(id) {
    const event = events.find(e => e.id === id);
    if (event) {
        document.getElementById('eventId').value = event.id;
        document.getElementById('eventName').value = event.name;
        document.getElementById('eventDate').value = event.date;
        document.getElementById('eventLocation').value = event.location;
        document.getElementById('eventType').value = event.type;
    }
}

// Delete event
function deleteEvent(id) {
    const event = events.find(e => e.id === id);
    if (confirm(`Are you sure you want to delete event "${event.name}"?`)) {
        events = events.filter(e => e.id !== id);
        localStorage.setItem('events', JSON.stringify(events));
        renderEvents();
    }
}

// Clear form
function clearForm() {
    document.getElementById('eventId').value = '';
    eventForm.reset();
}

// Format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}
