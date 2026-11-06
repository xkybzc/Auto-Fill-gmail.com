function isPasswordField(target) {
    if (target.tagName !== 'INPUT') {
        return false;
    }

    const type = (target.getAttribute('type') || '').toLowerCase();
    const autocomplete = (target.getAttribute('autocomplete') || '').toLowerCase();
    const name = (target.getAttribute('name') || '').toLowerCase();
    const id = (target.getAttribute('id') || '').toLowerCase();

    return (
        type === 'password' ||
        autocomplete.includes('password') ||
        name.includes('password') ||
        name.includes('passcode') ||
        id.includes('password') ||
        id.includes('passcode')
    );
}

function hidePasswordRevealButton() {
    const style = document.createElement('style');
    style.textContent = `
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear {
            display: none;
        }
        input[type="password"]::-webkit-credentials-auto-fill-button {
            visibility: hidden;
            pointer-events: none;
        }
    `;
    document.documentElement.appendChild(style);
}

hidePasswordRevealButton();

const DOMAIN = 'gmail.com';

// type="email" (and number, etc.) inputs don't expose the caret:
// selectionStart is null and setSelectionRange throws.
function supportsSelection(input) {
    try {
        return input.selectionStart !== null;
    } catch (err) {
        return false;
    }
}

// Set the value through the native setter so frameworks like React, which
// wrap the element's `value` property to track changes, notice the update.
function setNativeValue(element, value) {
    const proto = element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(element, value);
}

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

    // Never modify password fields, including password inputs rendered as text.
    if (isPasswordField(target)) {
        return;
    }

    // Handle standard input fields
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        const val = target.value;
        const caretKnown = supportsSelection(target);

        // Without a caret position we can't tell where the user is typing,
        // so only act when '@' was just typed and assume it's at the end.
        if (!caretKnown && e.data !== '@') {
            return;
        }

        const cursorPos = caretKnown ? target.selectionStart : val.length;

        // Check if the last typed character before cursor was '@'
        if (cursorPos > 0 && val[cursorPos - 1] === '@') {
            const before = val.slice(0, cursorPos);
            const after = val.slice(cursorPos);

            // Check if gmail.com isn't already directly following the @
            if (!after.startsWith(DOMAIN)) {
                setNativeValue(target, before + DOMAIN + after);

                // Move cursor right after 'gmail.com'
                if (caretKnown) {
                    const newPos = cursorPos + DOMAIN.length;
                    target.setSelectionRange(newPos, newPos);
                }

                // Let the page's framework (React, Vue, ...) sync its state.
                target.dispatchEvent(new Event('input', { bubbles: true }));
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

function isEditableTarget(target) {
    return (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLElement && target.isContentEditable
    );
}

function getEditableTarget(e) {
    const path = typeof e.composedPath === 'function'
        ? e.composedPath()
        : [e.target];

    for (const target of path) {
        if (isEditableTarget(target)) {
            return target;
        }
    }

    return null;
}

function handleDocumentInput(e) {
    const target = getEditableTarget(e);
    if (target) {
        handleInput({
            target,
            inputType: e.inputType,
            data: e.data
        });
    }
}

function handleDocumentKeydown(e) {
    const target = getEditableTarget(e);
    if (target) {
        handleKeydown({
            currentTarget: target,
            key: e.key
        });

        if (e.key === '@') {
            setTimeout(() => {
                handleInput({
                    target,
                    inputType: 'insertText',
                    data: '@'
                });
            }, 0);
        }
    }
}

function handleDocumentKeyup(e) {
    if (e.key === 'Backspace' || e.key === 'Delete') {
        return;
    }

    const target = getEditableTarget(e);
    if (target) {
        handleInput({
            target,
            inputType: ''
        });
    }
}

document.addEventListener('input', handleDocumentInput, true);
document.addEventListener('keydown', handleDocumentKeydown, true);
document.addEventListener('keyup', handleDocumentKeyup, true);