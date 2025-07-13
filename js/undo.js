
function showUndoNotification(onConfirm, onUndo) {
    let notification = document.getElementById('undo-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'undo-notification';
        document.body.appendChild(notification);
    }

    notification.innerHTML = `
        <span>Item deleted.</span>
        <button id="undo-btn">Undo</button>
    `;

    notification.classList.add('visible');

    const undoBtn = document.getElementById('undo-btn');
    let timeoutId;

    const confirmDeletion = () => {
        notification.classList.remove('visible');
        onConfirm();
    };

    const undoDeletion = () => {
        clearTimeout(timeoutId);
        notification.classList.remove('visible');
        onUndo();
    };

    timeoutId = setTimeout(confirmDeletion, 5000); // 5 seconds to undo
    undoBtn.addEventListener('click', undoDeletion, { once: true });
}
