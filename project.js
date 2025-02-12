document.addEventListener('DOMContentLoaded', () => {
    // Setup button click handlers
    const buttons = document.querySelectorAll('.nav-button');
    
    buttons.forEach(button => {
        button.addEventListener('click', (e) => {
            const href = button.getAttribute('data-href');
            // Add fade out effect before navigation
            document.body.style.opacity = '0';
            setTimeout(() => {
                window.location.href = href;
            }, 300);
        });
    });

    // Add page load animation
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.opacity = '1';
        document.body.style.transition = 'opacity 0.5s ease';
    }, 100);

    // Add button hover effect
    buttons.forEach(button => {
        button.addEventListener('mouseenter', () => {
            const description = button.querySelector('.button-description');
            description.style.opacity = '1';
        });

        button.addEventListener('mouseleave', () => {
            const description = button.querySelector('.button-description');
            description.style.opacity = '0.8';
        });
    });
});

// Prevent transition effects on page load
window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        document.body.style.opacity = '1';
    }
});