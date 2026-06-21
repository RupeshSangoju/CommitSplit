import * as vscode from "vscode";
import { BlameResult } from "./gitBlame";
import * as path from "path";

let currentPanel: vscode.WebviewPanel | undefined;

export function showAuthorPanel(
  context: vscode.ExtensionContext,
  result: BlameResult
): void {
  const fileName = path.basename(result.filePath);

  if (currentPanel) {
    currentPanel.reveal(vscode.ViewColumn.Beside);
    currentPanel.title = `Authors: ${fileName}`;
    currentPanel.webview.html = buildHtml(result, fileName);
    return;
  }

  currentPanel = vscode.window.createWebviewPanel(
    "gitLineAuthors",
    `Authors: ${fileName}`,
    vscode.ViewColumn.Beside,
    { enableScripts: true }
  );

  currentPanel.webview.html = buildHtml(result, fileName);

  currentPanel.onDidDispose(() => {
    currentPanel = undefined;
  }, null, context.subscriptions);
}

function buildHtml(result: BlameResult, fileName: string): string {
  const rows = result.stats
    .map((s, i) => {
      const bar = `<div class="bar" style="width:${s.percentage.toFixed(1)}%"></div>`;
      return `
        <tr class="${i % 2 === 0 ? "even" : "odd"}">
          <td class="rank">${i + 1}</td>
          <td class="author">
            <span class="avatar" style="background:${avatarColor(s.author)}">${initials(s.author)}</span>
            <div>
              <div class="name">${escHtml(s.author)}</div>
              <div class="email">${escHtml(s.email)}</div>
            </div>
          </td>
          <td class="lines">${s.lines.toLocaleString()}</td>
          <td class="pct">
            <div class="bar-wrap">${bar}<span>${s.percentage.toFixed(1)}%</span></div>
          </td>
        </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Git Line Authors</title>
<style>
  :root {
    --bg: var(--vscode-editor-background, #1e1e1e);
    --fg: var(--vscode-editor-foreground, #d4d4d4);
    --border: var(--vscode-panel-border, #333);
    --accent: var(--vscode-button-background, #0e639c);
    --even: var(--vscode-list-hoverBackground, #2a2d2e);
    --sub: var(--vscode-descriptionForeground, #858585);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: var(--vscode-font-family, sans-serif); font-size: 13px;
         background: var(--bg); color: var(--fg); padding: 20px; }
  h1 { font-size: 15px; margin-bottom: 4px; }
  .subtitle { color: var(--sub); font-size: 12px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; }
  thead th { text-align: left; padding: 6px 10px; border-bottom: 1px solid var(--border);
             color: var(--sub); font-weight: 600; font-size: 11px; text-transform: uppercase; }
  td { padding: 8px 10px; vertical-align: middle; }
  tr.even td { background: var(--even); }
  .rank { width: 36px; color: var(--sub); text-align: center; }
  .author { display: flex; align-items: center; gap: 10px; }
  .avatar { width: 32px; height: 32px; border-radius: 50%; display: flex;
            align-items: center; justify-content: center;
            font-weight: 700; font-size: 12px; color: #fff; flex-shrink: 0; }
  .name { font-weight: 600; }
  .email { font-size: 11px; color: var(--sub); }
  .lines { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .pct { width: 200px; }
  .bar-wrap { display: flex; align-items: center; gap: 8px; }
  .bar { height: 8px; border-radius: 4px; background: var(--accent); min-width: 2px; }
  .bar-wrap span { font-size: 12px; white-space: nowrap; }
  .empty { text-align: center; padding: 40px; color: var(--sub); }
</style>
</head>
<body>
<h1>&#x1F4CA; Line Authorship &mdash; ${escHtml(fileName)}</h1>
<p class="subtitle">Total tracked lines: ${result.totalLines.toLocaleString()}</p>
${
  result.stats.length === 0
    ? `<p class="empty">No blame data found.</p>`
    : `<table>
  <thead>
    <tr>
      <th>#</th>
      <th>Author</th>
      <th style="text-align:right">Lines</th>
      <th>Contribution</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`
}
</body>
</html>`;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

const PALETTE = [
  "#e74c3c","#e67e22","#f1c40f","#2ecc71","#1abc9c",
  "#3498db","#9b59b6","#e91e63","#00bcd4","#8bc34a",
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xfffffff;
  }
  return PALETTE[hash % PALETTE.length];
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
