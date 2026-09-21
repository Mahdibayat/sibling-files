# Sibling Files

Quickly browse and open files from the current directory and its parent directory without leaving your keyboard.

## Features

- Show files in the current directory
- Show files and folders from the parent directory
- Preview the contents of direct child folders in the parent directory
- Quickly search through the displayed files using VS Code's Quick Pick
- Open files directly in the editor
- Automatically ignores common generated and dependency directories

## Usage

Open any file in VS Code and run:

**Sibling Files: Open**

Or use the configured keyboard shortcut:

`Ctrl + Alt + F`

The extension displays files from the current directory first, followed by files and folders from the parent directory.

### Example

Given the following project structure:

```text
src/
├── components/
│   ├── Header/
│   │   ├── Header.tsx
│   │   └── index.ts
│   ├── Footer/
│   │   ├── Footer.tsx
│   │   └── index.ts
│   └── Button/
│       └── Button.tsx
└── pages/
    └── index.ts
```
