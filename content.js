function handleInput(e) {
    // Do not reinsert the domain while the user is deleting text.
    if (
        (e.inputType && e.inputType.startsWith('delete')) ||
        e.target.dataset.gmailAutoDomainDeleting === 'true'
    ) {
        delete e.target.dataset.gmailAutoDomainDeleting;
        return;
    }

    const target = e.target;

    // Handle standard input fields
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        const val = target.value;
        const cursorPos = target.selectionStart;

        // Check if the last typed character before cursor was '@'
        if (cursorPos > 0 && val[cursorPos - 1] === '@') {
            const before = val.slice(0, cursorPos);
            const after = val.slice(cursorPos);

            // Check if gmail.com isn't already directly following the @
            if (!after.startsWith('gmail.com')) {
                target.value = before + 'gmail.com' + after;
                // Move cursor right after 'gmail.com'
                const newPos = cursorPos + 'gmail.com'.length;
                target.setSelectionRange(newPos, newPos);
            }
            }
    }
    // Handle rich-text / contenteditable areas (e.g., recipient input chips)
    else if (target.isContentEditable) {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const node = range.startContainer;

        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent;
            const offset = range.startOffset;

            if (offset > 0 && text[offset - 1] === '@') {
                const remaining = text.slice(offset);
                if (!remaining.startsWith('gmail.com')) {
                    node.textContent = text.slice(0, offset) + 'gmail.com' + remaining;

            // Restore cursor position after inserted text
                    const newRange = document.createRange();
                    newRange.setStart(node, offset + 'gmail.com'.length);
                    newRange.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                    }
            }
        }
    }
    }

function handleKeydown(e) {
    if (e.key !== 'Backspace' && e.key !== 'Delete') {
        return;
    }

    const element = e.currentTarget;
    element.dataset.gmailAutoDomainDeleting = 'true';
    setTimeout(() => {
        delete element.dataset.gmailAutoDomainDeleting;
    }, 0);
}

// Attach event listener to newly detected inputs
function attachListener(element) {
    if (!element.dataset.gmailAutoDomainAttached) {
        element.addEventListener('input', handleInput);
        element.addEventListener('keydown', handleKeydown);
        element.dataset.gmailAutoDomainAttached = 'true';
    }
}

// Observe Gmail's dynamic UI additions
const observer = new MutationObserver(() => {
    const inputs = document.querySelectorAll('input, [contenteditable="true"]');
    inputs.forEach(attachListener);
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});