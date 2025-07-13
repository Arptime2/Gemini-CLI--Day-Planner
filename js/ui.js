window.applyTheme = function(theme) {
    document.body.classList.toggle('light-theme', theme === 'light');
};

// Apply theme on initial load
window.applyTheme(localStorage.getItem('theme') || 'dark');

document.addEventListener('DOMContentLoaded', () => {
    const navContainer = document.getElementById('main-nav');
    if (navContainer) {
        fetch('nav.html')
            .then(response => response.text())
            .then(data => {
                navContainer.innerHTML = data;
                const currentPage = window.location.pathname.split('/').pop();
                const navLinks = navContainer.querySelectorAll('a');
                navLinks.forEach(link => {
                    if (link.getAttribute('href') === currentPage) {
                        link.classList.add('active');
                    }
                });
            });
    }

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            }, err => {
                console.log('ServiceWorker registration failed: ', err);
            });
        });
    }

    async function scheduleNotifications() {
        if ('Notification' in window && Notification.permission === 'granted') {
            const tasks = await window.db.getAllItems('tasks');
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            tasks.forEach(task => {
                if (task.dueDate) {
                    const dueDate = new Date(task.dueDate);
                    dueDate.setHours(0, 0, 0, 0);

                    if (dueDate.getTime() === today.getTime()) {
                        new Notification('Task Due Today', {
                            body: task.text,
                        });
                    }
                }
            });
        }
    }

    if (window.db) {
        window.db.initDB().then(scheduleNotifications);
    }
});