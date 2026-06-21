import * as vscode from "vscode";
import { getBlameStats } from "./gitBlame";
import { showAuthorPanel } from "./panel";
import {
  getOrCreateStatusBarItem,
  updateStatusBar,
  disposeStatusBar,
} from "./statusBar";

async function resolveTargetFile(
  uri: vscode.Uri | undefined
): Promise<vscode.Uri | undefined> {
  if (uri && uri.scheme === "file") {
    return uri;
  }

  const editor = vscode.window.activeTextEditor;
  if (editor && !editor.document.isUntitled && editor.document.uri.scheme === "file") {
    return editor.document.uri;
  }

  const picked = await vscode.window.showOpenDialog({
    canSelectMany: false,
    canSelectFolders: false,
    openLabel: "Show Author Stats",
  });
  return picked?.[0];
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(getOrCreateStatusBarItem());

  const refresh = async (editor: vscode.TextEditor | undefined) => {
    const config = vscode.workspace.getConfiguration("gitLineAuthors");
    const showOnStatusBar = config.get<boolean>("showOnStatusBar", true);

    if (!editor || editor.document.isUntitled || editor.document.uri.scheme !== "file") {
      updateStatusBar(null);
      return;
    }

    if (!showOnStatusBar) {
      updateStatusBar(null);
      return;
    }

    try {
      const ignoreWS = config.get<boolean>("ignoreWhitespaceOnly", true);
      const result = await getBlameStats(editor.document.uri.fsPath, ignoreWS);
      updateStatusBar(result);
    } catch {
      updateStatusBar(null);
    }
  };

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(refresh),
    vscode.workspace.onDidSaveTextDocument(() =>
      refresh(vscode.window.activeTextEditor)
    )
  );

  refresh(vscode.window.activeTextEditor);

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "gitLineAuthors.showAuthors",
      async (uri?: vscode.Uri) => {
      const target = await resolveTargetFile(uri);
      if (!target) {
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Calculating author stats…",
          cancellable: false,
        },
        async () => {
          try {
            const config = vscode.workspace.getConfiguration("gitLineAuthors");
            const ignoreWS = config.get<boolean>("ignoreWhitespaceOnly", true);
            const result = await getBlameStats(
              target.fsPath,
              ignoreWS
            );

            if (!result.isGitRepo) {
              vscode.window.showErrorMessage(
                "This file is not inside a git repository."
              );
              return;
            }

            if (result.stats.length === 0) {
              vscode.window.showInformationMessage(
                "No blame data available. Make sure the file has at least one commit."
              );
              return;
            }

            const lines = result.stats
              .map(
                (s) =>
                  `${s.author}: ${s.lines} lines (${s.percentage.toFixed(1)}%)`
              )
              .join("\n");

            vscode.window.showInformationMessage(
              `Author stats (${result.totalLines} total lines):\n${lines}`,
              "Open Panel"
            ).then((choice) => {
              if (choice === "Open Panel") {
                showAuthorPanel(context, result);
              }
            });
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            vscode.window.showErrorMessage(`Git blame failed: ${msg}`);
          }
        }
      );
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "gitLineAuthors.showAuthorsInPanel",
      async (uri?: vscode.Uri) => {
        const target = await resolveTargetFile(uri);
        if (!target) {
          return;
        }

        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Calculating author stats…",
            cancellable: false,
          },
          async () => {
            try {
              const config =
                vscode.workspace.getConfiguration("gitLineAuthors");
              const ignoreWS = config.get<boolean>(
                "ignoreWhitespaceOnly",
                true
              );
              const result = await getBlameStats(
                target.fsPath,
                ignoreWS
              );

              if (!result.isGitRepo) {
                vscode.window.showErrorMessage(
                  "This file is not inside a git repository."
                );
                return;
              }

              if (result.stats.length === 0) {
                vscode.window.showInformationMessage(
                  "No blame data available. Make sure the file has at least one commit."
                );
                return;
              }

              showAuthorPanel(context, result);
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err);
              vscode.window.showErrorMessage(`Git blame failed: ${msg}`);
            }
          }
        );
      }
    )
  );
}

export function deactivate(): void {
  disposeStatusBar();
}
