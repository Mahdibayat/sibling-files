import * as vscode from "vscode";
import * as path from "node:path";
import * as fs from "node:fs/promises";

type FileItem = vscode.QuickPickItem & {
  filePath?: string;
};

const IGNORED_DIRECTORIES = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  "coverage",
]);

const IGNORED_FILES = new Set([".DS_Store"]);

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "siblingFiles.open",
    async () => {
      await showSiblingFiles();
    },
  );

  context.subscriptions.push(disposable);
}

async function showSiblingFiles(): Promise<void> {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    vscode.window.showInformationMessage("No active file.");
    return;
  }

  const currentFile = editor.document.uri.fsPath;
  const currentDirectory = path.dirname(currentFile);
  const parentDirectory = path.dirname(currentDirectory);

  const [currentItems, parentItems] = await Promise.all([
    getCurrentDirectoryItems(currentDirectory, currentFile),
    getParentDirectoryItems(parentDirectory),
  ]);

  const items: FileItem[] = [
    {
      label: `$(folder-opened) ${path.basename(currentDirectory)}`,
      kind: vscode.QuickPickItemKind.Separator,
    },

    ...currentItems,

    {
      label: `$(folder) ${path.basename(parentDirectory)}`,
      kind: vscode.QuickPickItemKind.Separator,
    },

    ...parentItems,
  ];

  const quickPick = vscode.window.createQuickPick<FileItem>();

  quickPick.placeholder = "Search files in current and parent directories...";

  quickPick.matchOnDescription = true;
  quickPick.items = items;

  quickPick.onDidAccept(async () => {
    const selected = quickPick.selectedItems[0];

    if (!selected?.filePath) {
      return;
    }

    const stat = await fs.stat(selected.filePath);

    if (stat.isDirectory()) {
      await vscode.commands.executeCommand(
        "revealFileInOS",
        vscode.Uri.file(selected.filePath),
      );

      return;
    }

    await vscode.window.showTextDocument(vscode.Uri.file(selected.filePath), {
      preview: false,
    });

    quickPick.hide();
  });

  quickPick.onDidHide(() => {
    quickPick.dispose();
  });

  quickPick.show();
}

async function getCurrentDirectoryItems(
  directory: string,
  currentFile: string,
): Promise<FileItem[]> {
  const entries = await readDirectory(directory);

  return entries
    .filter((entry) => entry.fullPath !== currentFile)
    .map((entry) => ({
      label: entry.isDirectory
        ? `$(folder) ${entry.name}/`
        : `$(file) ${entry.name}`,
      description: entry.isDirectory ? "directory" : "file",
      filePath: entry.fullPath,
    }));
}

async function getParentDirectoryItems(
  parentDirectory: string,
): Promise<FileItem[]> {
  const entries = await readDirectory(parentDirectory);

  const items: FileItem[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory) {
      items.push({
        label: `$(file) ${entry.name}`,
        description: path.basename(parentDirectory),
        filePath: entry.fullPath,
      });

      continue;
    }

    const children = await readDirectory(entry.fullPath);

    items.push({
      label: `$(folder) ${entry.name}/`,
      description: "directory",
      filePath: entry.fullPath,
    });

    for (const child of children) {
      items.push({
        label: child.isDirectory
          ? `    $(folder) ${child.name}/`
          : `    $(file) ${child.name}`,
        description: `${entry.name}/`,
        filePath: child.fullPath,
      });
    }
  }

  return items;
}

async function readDirectory(directory: string): Promise<
  Array<{
    name: string;
    fullPath: string;
    isDirectory: boolean;
  }>
> {
  try {
    const entries = await fs.readdir(directory, {
      withFileTypes: true,
    });

    return entries
      .filter((entry) => {
        if (entry.isDirectory()) {
          return !IGNORED_DIRECTORIES.has(entry.name);
        }

        return !IGNORED_FILES.has(entry.name);
      })
      .map((entry) => ({
        name: entry.name,
        fullPath: path.join(directory, entry.name),
        isDirectory: entry.isDirectory(),
      }))
      .sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) {
          return a.isDirectory ? -1 : 1;
        }

        return a.name.localeCompare(b.name);
      });
  } catch {
    return [];
  }
}

export function deactivate() {}
