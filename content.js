function isEmailField(target) {
    // Check if standard input explicitly looks like an email field
    if (target.tagName === 'INPUT') {
        const type = (target.getAttribute('type') || '').toLowerCase();
        const name = (target.getAttribute('name') || '').toLowerCase();
        const id = (target.getAttribute('id') || '').toLowerCase();
        const autocomplete = (target.getAttribute('autocomplete') || '').toLowerCase();
        
        if (
        type === 'email' ||
        name.includes('email') ||
        name.includes('user') ||
        id.includes('email') ||
        id.includes('identifier') ||
        autocomplete.includes('email') ||
        autocomplete.includes('username')
        ) {
        return true;
        }
        // If it's a generic text/search input on a login page, we can also let it pass
        // depending on your preference, but checking attributes is safest.
    }
    
    // For rich-text or contenteditable fields (like Gmail composer)
    if (target.isContentEditable) {
        return true;
    }

    return false;
    }

function handleInput(e) {
    const target = e.target;

    // Only run if it's an email/username input field
    if (!isEmailField(target)) return;

    // Handle standard input fields
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        const val = target.value;
        const cursorPos = target.selectionStart;

        // Check if the last typed character before cursor was '@'
        if (cursorPos > 0 && val[cursorPos - 1] === '@') {
        const before = val.slice(0, cursorPos);
        const after = val.slice(cursorPos);

        // Check if gmail.com isn't already directly following the @
        if (!after.toLowerCase().startsWith('gmail.com')) {
            target.value = before + 'gmail.com' + after;
            const newPos = cursorPos + 'gmail.com'.length;
            target.setSelectionRange(newPos, newPos);
        }
        }
    }
    // Handle contenteditable areas
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
            if (!remaining.toLowerCase().startsWith('gmail.com')) {
            node.textContent = text.slice(0, offset) + 'gmail.com' + remaining;
            
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

function attachListener(element) {
    if (!element.dataset.globalAutoDomainAttached) {
        element.addEventListener('input', handleInput);
        element.dataset.globalAutoDomainAttached = 'true';
    }
}

// Observe dynamic DOM changes across websites
const observer = new MutationObserver(() => {
    const inputs = document.querySelectorAll('input, [contenteditable="true"]');
    inputs.forEach(attachListener);
    });

observer.observe(document.body, {
    childList: true,
    subtree: true
});