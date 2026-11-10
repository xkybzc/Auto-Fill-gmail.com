# Gmail Auto-Fill Domain

A browser extension that adds `gmail.com` when type @.

`john@` will become `john@gmail.com`.

## Features

- Works on any website
- Only fills email and username fields. Fields are counted as email or username when:
  - is `type="email"`, or
  - have `autocomplete` set to `email` or `username`, or
  - have a name, id, placeholder or label containing `email`, `e-mail`,
    `user`, `login`, `identifier` or `recipient`.
- Never add `gmail.com` in password, search, comment, chat or any other type of field.
- Doesn't add `gmail.com` again after you delete it, or if it's already there.
- Works with sites built on frameworks such as React.

## Installation

1. Download or clone this repository.
2. Open manage extension.
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select the project folder.

## Privacy

The extension asks for no extra permissions and has no network code. All
changes happen inside the page you're typing in.
