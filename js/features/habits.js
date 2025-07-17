document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('add-habit-form');
    const habitInput = document.getElementById('habit-input');
    const graphContainer = document.getElementById('habit-graph-container');
    const habitListEl = document.getElementById('habit-list');

    let habitsCache = [];

    async function init() {
        habitsCache = await window.db.getAllItems('habits');
        render();
    }

    function render() {
        renderGraph();
        renderList();
    }

    function renderGraph() {
        const data = getGraphData();
        const maxCount = Math.max(...data.map(d => d.count), 1); // Avoid division by zero

        let graphHtml = '<svg class="habit-graph" width="100%" height="250">';
        const barWidth = 50;
        const spacing = 30;

        data.forEach((day, i) => {
            const barHeight = (day.count / maxCount) * 200; // 200 is max height of bar
            const x = i * (barWidth + spacing) + 40;
            const y = 220 - barHeight;

            graphHtml += `
                <rect class="bar" x="${x}" y="${y}" width="${barWidth}" height="${barHeight}"></rect>
                <text class="axis-label" x="${x + barWidth / 2}" y="240" text-anchor="middle">${day.label}</text>
            `;
        });

        graphHtml += '</svg>';
        graphContainer.innerHTML = graphHtml;
    }

    function getGraphData() {
        const data = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dayString = date.toISOString().split('T')[0];
            const label = date.toLocaleDateString('en-US', { weekday: 'short' });

            const count = habitsCache.filter(habit => habit.completed?.includes(dayString)).length;
            data.push({ label, count });
        }
        return data;
    }

    function renderList() {
        habitListEl.innerHTML = '';
        if (habitsCache.length === 0) {
            habitListEl.innerHTML = '<p>No habits yet. Add one below.</p>';
            return;
        }

        const todayStr = new Date().toISOString().split('T')[0];

        habitsCache.forEach(habit => {
            const itemEl = document.createElement('div');
            itemEl.className = 'habit-list-item';
            const isCompleted = habit.completed?.includes(todayStr);

            itemEl.innerHTML = `
                <p>${habit.text}</p>
                <button class="complete-habit-btn button-primary ${isCompleted ? 'completed' : ''}" data-habit-id="${habit.id}">
                    ${isCompleted ? 'Done' : 'Complete for Today'}
                </button>
            `;

            if (isCompleted) {
                itemEl.querySelector('.complete-habit-btn').disabled = true;
            }

            habitListEl.appendChild(itemEl);
        });
    }

    async function addHabit(event) {
        event.preventDefault();
        const text = habitInput.value.trim();
        if (text) {
            const newHabit = { text, completed: [] };
            const newId = await window.db.addItem('habits', newHabit);
            newHabit.id = newId;
            habitsCache.push(newHabit);
            render();
            habitInput.value = '';
        }
    }

    async function completeHabit(habitId) {
        const habit = habitsCache.find(h => h.id === habitId);
        if (!habit) return;

        const todayStr = new Date().toISOString().split('T')[0];
        habit.completed = habit.completed || [];

        if (!habit.completed.includes(todayStr)) {
            habit.completed.push(todayStr);
            habit.lastModified = new Date().toISOString();
            await window.db.updateItem('habits', habit);
            render();
        }
    }

    habitListEl.addEventListener('click', (event) => {
        const target = event.target;
        if (target.classList.contains('complete-habit-btn') && !target.classList.contains('completed')) {
            const habitId = parseInt(target.dataset.habitId, 10);
            completeHabit(habitId);
        }
    });

    form.addEventListener('submit', addHabit);
    window.db.initDB().then(init);
});