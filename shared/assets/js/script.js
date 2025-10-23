document.addEventListener('DOMContentLoaded', function() {
    const currentYearElement = document.getElementById('currentYear');
    if (currentYearElement) {
        currentYearElement.textContent = new Date().getFullYear();
    }

    // Handle projects link click to navigate parent window (for React Router)
    const projectsLink = document.querySelector('.projects-link');
    if (projectsLink) {
        projectsLink.addEventListener('click', function(e) {
            e.preventDefault();
            // Navigate parent window if in iframe, otherwise navigate normally
            if (window.parent !== window) {
                window.parent.location.href = '/projects';
            } else {
                window.location.href = '/projects';
            }
        });
    }
});
