document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const form = document.getElementById('add-task-form');
    const taskInput = document.getElementById('task-input');
    const taskDueDateInput = document.getElementById('task-due-date');
    const taskListContainer = document.getElementById('task-list');
    const listViewBtn = document.getElementById('list-view-btn');
    const kanbanViewBtn = document.getElementById('kanban-view-btn');
    const generateTasksBtn = document.getElementById('generate-tasks-btn');

    // --- STATE ---
    let currentView = 'list';
    let tasksCache = [];
    let habitsCache = [];
    let selectedHabitsCache = [];

    // --- INITIALIZATION ---
    async function init() {
        [tasksCache, habitsCache, selectedHabitsCache] = await Promise.all([
            window.db.getAllItems('tasks'),
            window.db.getAllItems('habits'),
            window.db.getAllItems('selected_habits')
        ]);
        setView('list');
        checkApiKey();
    }

    // --- RENDER LOGIC ---
    function render() {
        if (currentView === 'list') {
            renderListView();
        } else {
            renderKanbanView();
        }
    }

    function renderListView() {
        taskListContainer.innerHTML = '';
        taskListContainer.className = 'card';
        if (tasksCache.length === 0) {
            taskListContainer.innerHTML = '<p>No tasks yet. Add one!</p>';
            return;
        }
        tasksCache.forEach((task, index) => {
            const taskWrapper = createTaskElement(task, index);
            taskListContainer.appendChild(taskWrapper);
        });
    }

    function renderKanbanView() {
        taskListContainer.innerHTML = '';
        taskListContainer.className = 'card';
        const kanbanBoard = document.createElement('div');
        kanbanBoard.className = 'kanban-board';
        taskListContainer.appendChild(kanbanBoard);

        const columns = {
            todo: { title: 'To Do', tasks: [] },
            selected: { title: '✨ Selected', tasks: [], interactive: true },
            inprogress: { title: 'In Progress', tasks: [] },
            done: { title: 'Done', tasks: [] },
        };

        tasksCache.forEach(task => {
            const status = task.completed ? 'done' : (task.status || 'todo');
            if (columns[status]) {
                columns[status].tasks.push(task);
            }
        });

        selectedHabitsCache.forEach(habit => {
            const habitTask = {
                id: `habit-${habit.id}`,
                text: `(Habit) ${habit.text}`,
                status: 'selected',
                isHabit: true
            };
            columns.selected.tasks.push(habitTask);
        });

        for (const status in columns) {
                const column = columns[status];
                const columnEl = document.createElement('div');
                columnEl.className = 'kanban-column';
                columnEl.dataset.status = status;
                const titleEl = document.createElement('h3');
                titleEl.textContent = column.title;
                if (column.interactive) {
                    titleEl.classList.add('interactive-title');
                    titleEl.addEventListener('click', openDailyPlanModal);
                }
                columnEl.appendChild(titleEl);

                column.tasks.forEach(task => {
                    const cardEl = document.createElement('div');
                    cardEl.className = 'kanban-card';
                    cardEl.textContent = task.text;
                    cardEl.draggable = true;
                    cardEl.dataset.id = task.id;
                    columnEl.appendChild(cardEl);
                });

                columnEl.addEventListener('dragover', e => e.preventDefault());
                
                kanbanBoard.appendChild(columnEl);
            }
    }

    // --- TASK & ELEMENT CREATION ---
    function createTaskElement(task, index) {
        const taskWrapper = document.createElement('div');
        taskWrapper.className = 'task-wrapper';
        taskWrapper.dataset.taskId = task.id;
        const taskElement = document.createElement('div');
        taskElement.className = 'task-item';
        taskElement.style.setProperty('--i', index);
        if (task.completed) taskElement.classList.add('completed');

        taskElement.innerHTML = `
            <p>${task.text} ${task.dueDate ? `<em>(Due: ${task.dueDate})</em>` : ''}</p>
            <div>
                <button class="edit-btn">✏️</button>
                <button class="complete-btn">✔️</button>
                <button class="delete-btn">❌</button>
            </div>
        `;

        taskElement.querySelector('.edit-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openInlineEditor(task, taskWrapper);
        });
        taskElement.querySelector('.complete-btn').addEventListener('click', () => toggleTaskComplete(task.id));
        taskElement.querySelector('.delete-btn').addEventListener('click', () => deleteTask(task.id));
        taskWrapper.appendChild(taskElement);
        return taskWrapper;
    }

    async function addTask(event) {
        event.preventDefault();
        const text = taskInput.value.trim();
        if (text) {
            const newTask = { text, completed: false, status: 'todo', dueDate: taskDueDateInput.value, lastModified: new Date().toISOString() };
            const newId = await window.db.addItem('tasks', newTask);
            newTask.id = newId;
            tasksCache.push(newTask);
            render();
            taskInput.value = '';
            taskDueDateInput.value = '';
        }
    }

    async function toggleTaskComplete(taskId) {
        const task = tasksCache.find(t => t.id === taskId);
        if (!task) return;
        task.completed = !task.completed;
        task.status = task.completed ? 'done' : 'todo';
        await window.db.updateItem('tasks', task);
        render();
    }

    async function deleteTask(id) {
        if (confirm('Are you sure you want to delete this task?')) {
            await window.db.deleteItem('tasks', id);
            tasksCache = tasksCache.filter(t => t.id !== id);
            render();
        }
    }

    function openInlineEditor(task, taskWrapper) {
        const existingEditor = document.querySelector('.inline-editor');
        if (existingEditor) existingEditor.parentElement.removeChild(existingEditor);

        const editor = document.createElement('div');
        editor.className = 'inline-editor';
        editor.innerHTML = `
            <input type="text" value="${task.text}" class="inline-edit-text">
            <input type="date" value="${task.dueDate || ''}" class="inline-edit-date">
            <button class="inline-save-btn button-primary">Save</button>
            <button class="inline-cancel-btn button-primary">Cancel</button>
        `;
        taskWrapper.appendChild(editor);
        setTimeout(() => editor.classList.add('visible'), 10);

        editor.querySelector('.inline-save-btn').addEventListener('click', async () => {
            task.text = editor.querySelector('.inline-edit-text').value;
            task.dueDate = editor.querySelector('.inline-edit-date').value;
            await window.db.updateItem('tasks', task);
            render();
        });
        editor.querySelector('.inline-cancel-btn').addEventListener('click', () => {
            editor.classList.remove('visible');
            setTimeout(() => taskWrapper.removeChild(editor), 500);
        });
    }

    // --- KANBAN DRAG & DROP ---
    async function updateTaskStatus(taskId, newStatus) {
        const isHabitCard = taskId.startsWith('habit-');

        if (isHabitCard) {
            const habitId = parseInt(taskId.split('-')[1], 10);
            if (newStatus !== 'selected') {
                await window.db.deleteItem('selected_habits', habitId);
                selectedHabitsCache = selectedHabitsCache.filter(h => h.id !== habitId);
                render();
            }
        } else {
            const taskToUpdate = tasksCache.find(t => String(t.id) === taskId);
            if (taskToUpdate && newStatus && taskToUpdate.status !== newStatus) {
                taskToUpdate.status = newStatus;
                taskToUpdate.completed = newStatus === 'done';
                await window.db.updateItem('tasks', taskToUpdate);
                render();
            }
        }
    }

    async function handleGlobalDrop(event) {
        event.preventDefault();
        const transferredId = event.dataTransfer.getData('text/plain');
        const targetColumn = event.target.closest('.kanban-column');
        const newStatus = targetColumn ? targetColumn.dataset.status : null;
        updateTaskStatus(transferredId, newStatus);
    }

    // --- AI PLANNER ---
    async function generateTasks() {
        const promptText = prompt('Describe the tasks you want to generate (e.g., plan a birthday party):');
        if (!promptText) return;

        const result = await window.groq.callGroqAPI(`Generate a short, comma-separated list of tasks for: ${promptText}`);
        if (result) {
            const tasks = result.split(',').map(t => t.trim()).filter(t => t);
            for (const taskText of tasks) {
                const newTask = { text: taskText, completed: false, status: 'todo', dueDate: '' };
                const newId = await window.db.addItem('tasks', newTask);
                newTask.id = newId;
                tasksCache.push(newTask);
            }
            render();
        }
    }

    function openDailyPlanModal() {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.innerHTML = `
            <div class="modal-content">
                <button class="modal-close-btn">❌</button>
                <h2>Create Your Daily Plan</h2>
                <p>Enter tasks you must do today, and how many hours you have. The AI will select other tasks and habits from your lists to create a realistic plan.</p>
                <textarea id="manual-tasks-input" placeholder="Enter mandatory tasks, one per line..."></textarea>
                <input type="number" id="hours-input" placeholder="Available hours (e.g., 3)">
                <button id="generate-plan-btn" class="button-primary">Generate Plan</button>
            </div>
        `;
        document.body.appendChild(modalOverlay);
        document.body.classList.add('modal-open'); // Add class to body when modal is open

        document.getElementById('generate-plan-btn').addEventListener('click', generateDailyPlan);
        modalOverlay.querySelector('.modal-close-btn').addEventListener('click', () => {
            document.body.removeChild(modalOverlay);
            document.body.classList.remove('modal-open'); // Remove class when modal is closed
        });
    }

    async function generateDailyPlan() {
        const manualTasks = document.getElementById('manual-tasks-input').value.trim();
        const hours = document.getElementById('hours-input').value;

        if (!hours || isNaN(hours) || hours <= 0) {
            alert('Please enter a valid number of hours.');
            return;
        }

        const todoTasks = tasksCache.filter(t => t.status === 'todo').map(t => t.text);
        const todayStr = new Date().toISOString().split('T')[0];
        const uncompletedHabits = habitsCache.filter(h => !h.completed?.includes(todayStr)).map(h => h.text);

        const prompt = `
            You are an expert time management assistant. Your goal is to create a realistic daily plan.
            A user has ${hours} hours available today.
            The user has specified that the following tasks are MANDATORY: ${manualTasks || 'None'}.
            From the following lists of available tasks and habits, select a variety of items to fill the user's available time as completely as possible. Assume each task or habit takes about 30-45 minutes.
            Your response MUST ONLY be a comma-separated list of the names of the selected tasks and habits. DO NOT add any extra text, explanations, or formatting. DO NOT create new tasks or habits.

            Available Tasks: ${todoTasks.join(', ') || 'None'}
            Available Habits: ${uncompletedHabits.join(', ') || 'None'}
        `;

        const result = await window.groq.callGroqAPI(prompt);
        if (result) {
            const selectedItems = result.split(',').map(item => item.trim()).filter(Boolean);
            let itemsUpdated = 0;

            // Clear any previously selected tasks and habits
            await window.db.clearStore('selected_habits');
            tasksCache.forEach(task => {
                if (task.status === 'selected') {
                    task.status = 'todo';
                    window.db.updateItem('tasks', task);
                }
            });

            for (const itemName of selectedItems) {
                const task = tasksCache.find(t => t.text.toLowerCase() === itemName.toLowerCase());
                const habit = habitsCache.find(h => h.text.toLowerCase() === itemName.toLowerCase());

                if (task) {
                    task.status = 'selected';
                    await window.db.updateItem('tasks', task);
                    itemsUpdated++;
                } else if (habit) {
                    await window.db.addItem('selected_habits', habit);
                    itemsUpdated++;
                }
            }

            if (itemsUpdated > 0) render();
            const modalOverlay = document.querySelector('.modal-overlay');
            if (modalOverlay) {
                document.body.removeChild(modalOverlay);
                document.body.classList.remove('modal-open');
            }
        }
    }

    // --- UTILITY & SETUP ---
    function setView(view) {
        currentView = view;
        listViewBtn.classList.toggle('active', view === 'list');
        kanbanViewBtn.classList.toggle('active', view === 'kanban');
        render();
    }

    function checkApiKey() {
        if (localStorage.getItem('groq_api_key')) {
            generateTasksBtn.style.display = 'inline-block';
        }
    }

    // --- EVENT LISTENERS ---
    form.addEventListener('submit', addTask);
    listViewBtn.addEventListener('click', () => setView('list'));
    kanbanViewBtn.addEventListener('click', () => setView('kanban'));
    generateTasksBtn.addEventListener('click', generateTasks);
    taskListContainer.addEventListener('dragstart', e => {
        if (e.target.classList.contains('kanban-card')) {
            e.dataTransfer.setData('text/plain', e.target.dataset.id);
        }
    });
    taskListContainer.addEventListener('dragover', e => e.preventDefault()); // Allow drops anywhere on the container
    taskListContainer.addEventListener('drop', handleGlobalDrop);

    // --- TOUCH DRAG & DROP ---
    let draggedItem = null;
    let ghostElement = null;
    let lastOverColumn = null;
    let columnRects = [];

    function cacheColumnRects() {
        columnRects = [];
        document.querySelectorAll('.kanban-column').forEach(column => {
            columnRects.push(column.getBoundingClientRect());
        });
    }

    taskListContainer.addEventListener('touchstart', e => {
        const target = e.target.closest('.kanban-card');
        if (target) {
            cacheColumnRects(); // Cache the geometry on drag start
            draggedItem = target;
            const rect = target.getBoundingClientRect();
            ghostElement = target.cloneNode(true);
            ghostElement.style.position = 'absolute';
            ghostElement.style.width = `${rect.width}px`;
            ghostElement.style.height = `${rect.height}px`;
            ghostElement.style.pointerEvents = 'none';
            ghostElement.style.opacity = '0.8';
            ghostElement.style.background = 'var(--accent-color)';
            ghostElement.style.color = 'var(--background-color)';
            document.body.appendChild(ghostElement);

            const touch = e.touches[0];
            ghostElement.style.left = `${touch.clientX - rect.width / 2}px`;
            ghostElement.style.top = `${touch.clientY - rect.height / 2}px`;

            target.style.opacity = '0.4';
        }
    });

    taskListContainer.addEventListener('touchmove', e => {
        if (draggedItem && ghostElement) {
            e.preventDefault();
            const touch = e.touches[0];
            ghostElement.style.left = `${touch.clientX - ghostElement.offsetWidth / 2}px`;
            ghostElement.style.top = `${touch.clientY - ghostElement.offsetHeight / 2}px`;

            // Manual hit-testing
            let overColumn = null;
            for (let i = 0; i < columnRects.length; i++) {
                const rect = columnRects[i];
                if (touch.clientX > rect.left && touch.clientX < rect.right && touch.clientY > rect.top && touch.clientY < rect.bottom) {
                    overColumn = document.querySelectorAll('.kanban-column')[i];
                    break;
                }
            }

            if (overColumn !== lastOverColumn) {
                if (lastOverColumn) {
                    lastOverColumn.classList.remove('drag-over');
                }
                if (overColumn) {
                    overColumn.classList.add('drag-over');
                }
                lastOverColumn = overColumn;
            }
        }
    });

    taskListContainer.addEventListener('touchend', e => {
        if (draggedItem && ghostElement) {
            draggedItem.style.opacity = '1';

            // Determine the final status from the last column we were over.
            // If we are not over any column, newStatus will be null.
            const newStatus = lastOverColumn ? lastOverColumn.dataset.status : null;
            updateTaskStatus(draggedItem.dataset.id, newStatus);

            // Perform cleanup
            if (lastOverColumn) {
                lastOverColumn.classList.remove('drag-over');
            }
            document.body.removeChild(ghostElement);
            draggedItem = null;
            ghostElement = null;
            lastOverColumn = null;
        }
    });

    window.db.initDB().then(init);
});