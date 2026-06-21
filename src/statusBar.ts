import * as vscode from "vscode";
import { BlameResult } from "./gitBlame";

let statusBarItem: vscode.StatusBarItem | undefined;

export function getOrCreateStatusBarItem(): vscode.StatusBarItem {
  if (!statusBarItem) {
    statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    statusBarItem.command = "gitLineAuthors.showAuthorsInPanel";
    statusBarItem.tooltip = "Click to open Git Line Authors panel";
  }
  return statusBarItem;
}

export function updateStatusBar(result: BlameResult | null): void {
  const item = getOrCreateStatusBarItem();

  if (!result || !result.isGitRepo || result.stats.length === 0) {
    item.hide();
    return;
  }

  const top = result.stats[0];
  item.text = `$(git-commit) ${top.author}: ${top.percentage.toFixed(0)}%`;
  item.show();
}

export function disposeStatusBar(): void {
  statusBarItem?.dispose();
  statusBarItem = undefined;
}
