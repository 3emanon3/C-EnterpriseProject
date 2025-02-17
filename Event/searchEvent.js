const API_BASE_URL = 'http://localhost/projects/Enterprise/C-EnterpriseProject/recervingAPI.php';

document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("searchInput");
    const searchButton = document.getElementById("searchButton");
    const eventTableBody = document.querySelector("#eventTable tbody");
    const totalEvents = document.getElementById("totalEvents");
    const loader = document.querySelector(".loader");
    const itemsPerPageSelect = document.getElementById("itemsPerPage");
    let eventsData = [];
    let itemsPerPage = parseInt(itemsPerPageSelect.value);

    async function fetchEvents(query = "") {
        loader.style.display = "block";
        eventTableBody.innerHTML = "";
        try {
            const response = await fetch(`${API_BASE_URL}?search=${encodeURIComponent(query)}`);
            const data = await response.json();
            eventsData = data;
            totalEvents.textContent = eventsData.length;
            displayEvents(eventsData);
        } catch (error) {
            console.error("Error fetching events:", error);
        } finally {
            loader.style.display = "none";
        }
    }

    function displayEvents(events) {
        eventTableBody.innerHTML = "";
        events.slice(0, itemsPerPage).forEach(event => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${event.name}</td>
                <td>${event.date}</td>
                <td>${event.venue}</td>
                <td>${event.status}</td>
                <td>${event.capacity}</td>
                <td>${event.organizer}</td>
                <td>
                    <button class="btn btn-edit" onclick="editEvent(${event.id})">Edit</button>
                    <button class="btn btn-delete" onclick="deleteEvent(${event.id})">Delete</button>
                </td>
            `;
            eventTableBody.appendChild(row);
        });
    }

    searchButton.addEventListener("click", function () {
        fetchEvents(searchInput.value);
    });

    searchInput.addEventListener("keyup", function (event) {
        if (event.key === "Enter") {
            fetchEvents(searchInput.value);
        }
    });

    itemsPerPageSelect.addEventListener("change", function () {
        itemsPerPage = parseInt(this.value);
        displayEvents(eventsData);
    });

    window.editEvent = function (id) {
        alert(`Edit event with ID: ${id}`);
        // Implement edit functionality
    };

    window.deleteEvent = async function (id) {
        if (confirm("Are you sure you want to delete this event?")) {
            try {
                const response = await fetch(`${API_BASE_URL}?id=${id}`, { method: "DELETE" });
                if (response.ok) {
                    fetchEvents();
                } else {
                    alert("Failed to delete event.");
                }
            } catch (error) {
                console.error("Error deleting event:", error);
            }
        }
    };

    fetchEvents();
});
