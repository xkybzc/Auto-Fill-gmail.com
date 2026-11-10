# Gmail Auto-Fill Domain

A browser extension for that adds `gmail.com` for when type @.

`john@` will becomes `john@gmail.com`.

## Features

- Works on any website
- Only fills email and username fields. Fields are counted as email or username when:
  - are `type="email"`, or
  - have `autocomplete` set to `email` or `username`, or
  - have a name, id, placeholder or label containing `email`, `e-mail`,
    `user`, `login`, `identifier` or `recipient`.
- Never add in password fields, search, comment, chat or any other type.
- Doesn't add `gmail.com` again after you delete it, or if it's already there.
- Works with sites built on frameworks such as React.

## Installation

1. Download or clone this repository.
2. Open extension
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select the project folder.

## Privacy

The extension asks for no extra permissions and has no network code. All
changes happen inside the page you're typing in.
