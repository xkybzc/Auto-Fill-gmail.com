const DOMAIN = 'gmail.com';
const DELETING_FLAG = 'gmailAutoDomainDeleting';

// Words in a field's name, id, placeholder, or label that mark it as an
// email or username field
const EMAIL_FIELD_KEYWORDS = ['email', 'e-mail', 'user', 'login', 'identifier', 'recipient'];

const isDeleteKey = (key) => key === 'Backspace' || key === 'Delete';

// Check if the input should auto insert the gmail.com or not
function isPasswordField(target) {
    // Only input elements have an input type that can identify password fields
    if (target.tagName !== 'INPUT') {
        return false;
    }

    // Check other attributes because websites may identify password fields
    // with different combinations of type, autocomplete, name, and id.
    const attr = (name) => (target.getAttribute(name) || '').toLowerCase();
    const type = attr('type');
    const autocomplete = attr('autocomplete');
    const name = attr('name');
    const id = attr('id');

    // Treat any matching password-related attribute as a password field
    return (
        type === 'password' ||
        autocomplete.includes('password') ||
        ['password', 'passcode'].some((word) => name.includes(word) || id.includes(word))
    );
}

// Collects the visible text of every label that describes the field, both
// <label> elements and elements referenced by aria-labelledby
function getLabelTexts(target) {
    const texts = Array.from(target.labels || [], (label) => label.textContent);

    const labelledBy = target.getAttribute('aria-labelledby');
    if (labelledBy) {
        const root = target.getRootNode();
        for (const id of labelledBy.split(/\s+/)) {
            const label = root.getElementById ? root.getElementById(id) : null;
            if (label) texts.push(label.textContent);
        }
    }

    return texts;
}

// Check whether the field is meant for an email address or username, so the
// domain is not added when '@' is typed in comments, chats, or search boxes
function isEmailOrUsernameField(target) {
    // Inputs must be plain text or email boxes; search, url, etc. are skipped
    if (target.tagName === 'INPUT') {
        if (target.type === 'email') return true;
        if (target.type !== 'text') return false;
    }

    // The autocomplete hint is the most reliable signal when a site sets it
    const autocomplete = (target.getAttribute('autocomplete') || '').toLowerCase();
    if (autocomplete.includes('email') || autocomplete.includes('username')) {
        return true;
    }

    // Otherwise look for email/username keywords in the field's description
    const description = [
        target.getAttribute('name'),
        target.id,
        target.getAttribute('placeholder'),
        target.getAttribute('aria-label'),
        ...getLabelTexts(target),
    ].join(' ').toLowerCase();

    return EMAIL_FIELD_KEYWORDS.some((keyword) => description.includes(keyword));
}

// Adds CSS that hides browser-provided password reveal and autofill controls
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

// type="email" (and number, etc.) inputs don't expose the caret:
// selectionStart is null and setSelectionRange throws
// Check whether the target supports reading its current caret position
function supportsSelection(input) {
    try {
        return input.selectionStart !== null;
    } catch (err) {
        // Some input types throw when selectionStart is accessed
        return false;
    }
}

// Set the value through the native setter so frameworks like React, which
// wrap the value' property to track changes, notice the update
function setNativeValue(element, value) {
    // select the setter belonging to the actual element type
    const proto = element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(element, value);
}

// Handle standard input fields
function insertDomainInTextField(target, data) {
    const val = target.value;
    const caretKnown = supportsSelection(target);

    // Without a caret position we can't tell where the user is typing,
    // so only act when '@' was just typed and assume it's at the end.
    if (!caretKnown && data !== '@') {
        return;
    }

    const cursorPos = caretKnown ? target.selectionStart : val.length;

    // Only insert the domain when the character immediately before the
    // caret is an at sign.
    if (cursorPos === 0 || val[cursorPos - 1] !== '@') {
        return;
    }

    const before = val.slice(0, cursorPos);
    const after = val.slice(cursorPos);

    // Avoid duplicating the domain when it is already present.
    if (after.startsWith(DOMAIN)) {
        return;
    }

    setNativeValue(target, before + DOMAIN + after);

    // Keep typing positioned immediately after the inserted domain.
    if (caretKnown) {
        const newPos = cursorPos + DOMAIN.length;
        target.setSelectionRange(newPos, newPos);
    }

    // Notify the change.
    target.dispatchEvent(new Event('input', { bubbles: true }));
}

// Handle rich-text / contenteditable areas
function insertDomainInContentEditable() {
    // Read the browser's current selection so the insertion happens at
    // the user's caret rather than at an arbitrary location.
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const node = range.startContainer;

    // Only text nodes have text content and character offsets to modify.
    if (node.nodeType !== Node.TEXT_NODE) return;

    const text = node.textContent;
    const offset = range.startOffset;

    // Detect an at sign immediately before the caret.
    if (offset === 0 || text[offset - 1] !== '@') return;

    const remaining = text.slice(offset);

    // Avoid duplicating gmail.com when it is already present.
    if (remaining.startsWith(DOMAIN)) return;

    node.textContent = text.slice(0, offset) + DOMAIN + remaining;

    // Restore the caret immediately after the inserted text.
    const newRange = document.createRange();
    newRange.setStart(node, offset + DOMAIN.length);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
}

// Inserts the Gmail domain when type @
function handleInput({ target, inputType, data }) {
    // Do not reinsert the domain while the user is deleting text.
    if (
        (inputType && inputType.startsWith('delete')) ||
        target.dataset[DELETING_FLAG] === 'true'
    ) {
        delete target.dataset[DELETING_FLAG];
        return;
    }

    // Never modify password fields, and only modify email or username fields
    if (isPasswordField(target) || !isEmailOrUsernameField(target)) {
        return;
    }

    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        insertDomainInTextField(target, data);
    } else if (target.isContentEditable) {
        insertDomainInContentEditable();
    }
}

// Marks an editable element while the user is deleting, preventing the input
// handler from immediately adding the domain back.
function handleKeydown({ currentTarget: element, key }) {
    if (!isDeleteKey(key)) {
        return;
    }

    element.dataset[DELETING_FLAG] = 'true';
    setTimeout(() => {
        delete element.dataset[DELETING_FLAG];
    }, 0);
}

// Checks whether an event target is an element that can contain user input.
function isEditableTarget(target) {
    return (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
    );
}

// Finds the actual editable element involved in an event, including events
// originating inside a shadow DOM.
function getEditableTarget(e) {
    const path = typeof e.composedPath === 'function'
        ? e.composedPath()
        : [e.target];

    return path.find(isEditableTarget) || null;
}

// Adapts a document-level input event to the input handler's expected shape.
function handleDocumentInput(e) {
    const target = getEditableTarget(e);
    if (!target) return;

    handleInput({ target, inputType: e.inputType, data: e.data });
}

// Handles deletion tracking and schedules insertion after a typed at sign.
function handleDocumentKeydown(e) {
    const target = getEditableTarget(e);
    if (!target) return;

    handleKeydown({ currentTarget: target, key: e.key });

    if (e.key === '@') {
        // Wait until the browser has inserted the at sign before
        // inspecting the field's updated value and caret position.
        setTimeout(() => {
            handleInput({ target, inputType: 'insertText', data: '@' });
        }, 0);
    }
}

// Re-checks the field after key-based edits that may not emit a usable input
// event, while leaving deletion handling to the keydown logic above.
function handleDocumentKeyup(e) {
    if (isDeleteKey(e.key)) {
        return;
    }

    const target = getEditableTarget(e);
    if (!target) return;

    handleInput({ target, inputType: '' });
}

hidePasswordRevealButton();

// Use capturing listeners so the content script can observe edits on Gmail's
// dynamically generated and nested editable elements.
document.addEventListener('input', handleDocumentInput, true);
document.addEventListener('keydown', handleDocumentKeydown, true);
document.addEventListener('keyup', handleDocumentKeyup, true);
