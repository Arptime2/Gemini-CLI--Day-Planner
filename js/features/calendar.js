document.addEventListener('DOMContentLoaded', () => {
    const monthYearHeader = document.getElementById('month-year-header');
    const calendarGrid = document.getElementById('calendar-grid');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    const calendarViewContainer = document.getElementById('calendar-view-container');
    const dayViewContainer = document.getElementById('day-view-container');

    let currentDate = new Date();
    let tasksCache = [];

    async function init() {
        tasksCache = await window.db.getAllItems('tasks');
        renderCalendar();
    }

    async function renderCalendar() {
        calendarGrid.innerHTML = '';
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        monthYearHeader.textContent = `${currentDate.toLocaleString('default', { month: 'long' })} ${year}`;

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        weekdays.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header';
            dayHeader.textContent = day;
            calendarGrid.appendChild(dayHeader);
        });

        for (let i = 0; i < firstDayOfMonth; i++) {
            calendarGrid.appendChild(document.createElement('div'));
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-day';
            const dayString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const tasksForDay = tasksCache.filter(task => task.dueDate === dayString);

            dayCell.innerHTML = `<span class="day-number">${day}</span>`;

            if (tasksForDay.length > 0) {
                const tasksList = document.createElement('ul');
                tasksForDay.forEach(task => {
                    const taskItem = document.createElement('li');
                    taskItem.textContent = task.text;
                    tasksList.appendChild(taskItem);
                });
                dayCell.appendChild(tasksList);
            }
            dayCell.addEventListener('click', () => showDayView(dayString, tasksForDay));
            calendarGrid.appendChild(dayCell);
        }
    }

    function showDayView(dayString, tasks) {
        calendarViewContainer.style.display = 'none';
        dayViewContainer.style.display = 'block';

        let tasksHtml = '<ul class="day-task-list">';
        if (tasks.length > 0) {
            tasks.forEach(task => {
                tasksHtml += `<li>${task.text}</li>`;
            });
        } else {
            tasksHtml += '<li>No tasks for this day.</li>';
        }
        tasksHtml += '</ul>';

        dayViewContainer.innerHTML = `
            <h2>Tasks for ${dayString}</h2>
            ${tasksHtml}
            <button id="back-to-calendar-btn" class="button-primary">Back to Calendar</button>
        `;

        document.getElementById('back-to-calendar-btn').addEventListener('click', showCalendarView);
    }

    function showCalendarView() {
        dayViewContainer.style.display = 'none';
        calendarViewContainer.style.display = 'block';
    }

    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    window.db.initDB().then(init);
});