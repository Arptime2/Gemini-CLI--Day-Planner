document.addEventListener('DOMContentLoaded', () => {
    const newNoteBtn = document.getElementById('new-note-btn');
    const notesListEl = document.getElementById('notes-list');
    const noteEditorContainer = document.getElementById('note-editor-container');

    let notesCache = [];
    let activeNoteId = null;
    let saveTimeout;

    async function init() {
        notesCache = await window.db.getAllItems('notes');
        renderNotesList();
        if (notesCache.length > 0) {
            const noteToOpen = notesCache.sort((a, b) => b.id - a.id)[0];
            openNote(noteToOpen.id);
        } else {
            showEmptyState();
        }
    }

    function renderNotesList() {
        notesListEl.innerHTML = '';
        const sortedNotes = [...notesCache].sort((a, b) => b.id - a.id);
        sortedNotes.forEach(note => {
            const noteElement = document.createElement('div');
            noteElement.className = 'note-list-item';
            noteElement.dataset.noteId = note.id;
            if (note.id === activeNoteId) {
                noteElement.classList.add('active');
            }
            noteElement.innerHTML = `
                <p class="note-title">${note.title || 'Untitled Note'}</p>
                <p class="note-snippet">${note.content ? note.content.substring(0, 40) + '...' : 'No content'}</p>
                <button class="delete-note-btn">🗑️</button>
            `;
            notesListEl.appendChild(noteElement);
        });
    }

    function handleNoteListClick(event) {
        const target = event.target;
        const noteItem = target.closest('.note-list-item');
        if (!noteItem) return;

        const noteId = parseInt(noteItem.dataset.noteId, 10);

        if (target.classList.contains('delete-note-btn')) {
            deleteNote(noteId);
        } else {
            openNote(noteId);
        }
    }

    function openNote(noteId) {
        activeNoteId = noteId;
        const note = notesCache.find(n => n.id === noteId);
        if (!note) {
            showEmptyState();
            return;
        }

        noteEditorContainer.innerHTML = `
            <div id="editor-pane">
                <input type="text" id="note-title-input" placeholder="Note Title" value="${note.title || ''}">
                <textarea id="note-content-input" placeholder="Start writing...">${note.content || ''}</textarea>
                <div id="editor-footer">
                    <span id="save-status">All changes saved.</span>
                    <button id="summarize-note-btn" class="button-primary">✨ Summarize</button>
                </div>
            </div>
            <div id="ai-summary-box" style="display: ${note.summary ? 'block' : 'none'};">
                <h3>AI Summary</h3>
                <p id="summary-content">${note.summary || ''}</p>
            </div>
        `;

        document.getElementById('note-title-input').addEventListener('input', handleInput);
        document.getElementById('note-content-input').addEventListener('input', handleInput);

        const summarizeBtn = document.getElementById('summarize-note-btn');
        if (localStorage.getItem('groq_api_key')) {
            summarizeBtn.addEventListener('click', summarizeActiveNote);
        } else {
            summarizeBtn.style.display = 'none';
        }

        renderNotesList();
    }

    function showEmptyState() {
        noteEditorContainer.innerHTML = '<div class="empty-state"><h2>Select a note or create a new one.</h2></div>';
        activeNoteId = null;
    }

    async function newNote() {
        const newNote = { title: 'Untitled Note', content: '', summary: '' };
        const newId = await window.db.addItem('notes', newNote);
        newNote.id = newId;
        notesCache.push(newNote);
        openNote(newId);
    }

    function handleInput() {
        const statusEl = document.getElementById('save-status');
        statusEl.textContent = 'Saving...';
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveActiveNote, 750);
    }

    async function saveActiveNote() {
        if (activeNoteId === null) return;
        const note = notesCache.find(n => n.id === activeNoteId);
        if (!note) return;

        const titleInput = document.getElementById('note-title-input');
        const contentInput = document.getElementById('note-content-input');
        const statusEl = document.getElementById('save-status');

        const newTitle = titleInput.value.trim();
        const newContent = contentInput.value;

        if (note.title !== newTitle || note.content !== newContent) {
            note.title = newTitle;
            note.content = newContent;
            await window.db.updateItem('notes', note);
            
            const listItem = notesListEl.querySelector(`[data-note-id="${activeNoteId}"]`);
            if (listItem) {
                listItem.querySelector('.note-title').textContent = newTitle || 'Untitled Note';
                listItem.querySelector('.note-snippet').textContent = newContent ? newContent.substring(0, 40) + '...' : 'No content';
            }
        }
        if (statusEl) statusEl.textContent = 'All changes saved.';
    }

        async function deleteNote(noteId) {
        const noteToDelete = notesCache.find(n => n.id === noteId);
        if (!noteToDelete) return;

        // Optimistically remove from UI
        notesCache = notesCache.filter(n => n.id !== noteId);
        if (activeNoteId === noteId) {
            activeNoteId = null;
            const nextNote = notesCache.sort((a, b) => b.id - a.id)[0];
            if (nextNote) {
                openNote(nextNote.id);
            } else {
                showEmptyState();
            }
        } else {
            renderNotesList();
        }

        // Show undo notification
        showUndoNotification(async () => {
            // User did not press undo, so delete from DB
            await window.db.deleteItem('notes', noteId);
        }, () => {
            // User pressed undo, so add it back to the cache and re-render
            notesCache.push(noteToDelete);
            renderNotesList();
            if(activeNoteId === null) openNote(noteToDelete.id);
        });
    }

    async function summarizeActiveNote() {
        if (activeNoteId === null) return;
        const note = notesCache.find(n => n.id === activeNoteId);
        const content = document.getElementById('note-content-input').value;

        if (!content) {
            alert('Cannot summarize an empty note.');
            return;
        }

        const summaryBox = document.getElementById('ai-summary-box');
        const summaryContentEl = document.getElementById('summary-content');
        summaryBox.style.display = 'block';
        summaryContentEl.textContent = 'Generating...';

        const prompt = `Summarize the following note concisely:\n\n${content}`;
        const summary = await window.groq.callGroqAPI(prompt);

        if (summary) {
            note.summary = summary;
            await window.db.updateItem('notes', note);
            summaryContentEl.textContent = summary;
        } else {
            summaryContentEl.textContent = 'Failed to generate summary.';
        }
    }

    newNoteBtn.addEventListener('click', newNote);
    notesListEl.addEventListener('click', handleNoteListClick);
    window.db.initDB().then(init);
});