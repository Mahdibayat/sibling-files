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
    getDirectoryItems(currentDirectory),
    getDirectoryItems(parentDirectory),
  ]);

  const items: FileItem[] = [
    {
      label: "$(folder-opened) Current directory",
      description: path.basename(currentDirectory),
      kind: vscode.QuickPickItemKind.Separator,
    },
    ...currentItems,

    {
      label: "$(folder) Parent directory",
      description: path.basename(parentDirectory),
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

async function getDirectoryItems(directory: string): Promise<FileItem[]> {
  try {
    const entries = await fs.readdir(directory, {
      withFileTypes: true,
    });

    const items: FileItem[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entry.name)) {
          continue;
        }

        items.push({
          label: `$(folder) ${entry.name}/`,
          description: "directory",
          filePath: path.join(directory, entry.name),
        });

        continue;
      }

      if (IGNORED_FILES.has(entry.name)) {
        continue;
      }

      items.push({
        label: `$(file) ${entry.name}`,
        description: "file",
        filePath: path.join(directory, entry.name),
      });
    }

    return items.sort((a, b) => {
      const aIsDirectory = a.description === "directory";
      const bIsDirectory = b.description === "directory";

      if (aIsDirectory !== bIsDirectory) {
        return aIsDirectory ? -1 : 1;
      }

      return a.label.localeCompare(b.label);
    });
  } catch {
    return [];
  }
}

export function deactivate() {}
